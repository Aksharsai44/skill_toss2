import os
from datetime import timedelta
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Institution, User, UserRole
from apps.academics.models import (
    Batch,
    Course,
    Department,
    ParentStudentLink,
    StudentEnrollment,
    Subject,
    TeacherAssignment,
)

from .models import (
    Assignment,
    AssignmentStatus,
    AttendanceRecord,
    AttendanceSession,
    AttendanceSessionStatus,
    AttendanceStatus,
    Submission,
    SubmissionStatus,
)


PASSWORD = "Learning-test-password-61!"


class LearningFixtureMixin:
    @classmethod
    def setUpTestData(cls):
        cls.one = Institution.objects.create(name="Institution One", code="LONE")
        cls.two = Institution.objects.create(name="Institution Two", code="LTWO")

        def user(role, label, institution):
            return User.objects.create_user(
                email=f"{label}@learning.test",
                password=PASSWORD,
                full_name=label.replace("-", " ").title(),
                role=role,
                institution=institution,
                is_active=True,
            )

        cls.product = user(UserRole.PRODUCT_ADMIN, "product", None)
        cls.super_admin = user(UserRole.SUPER_ADMIN, "super", cls.one)
        cls.admin = user(UserRole.ADMIN, "admin", cls.one)
        cls.teacher = user(UserRole.TEACHER, "teacher", cls.one)
        cls.unassigned_teacher = user(UserRole.TEACHER, "unassigned-teacher", cls.one)
        cls.student = user(UserRole.STUDENT, "student", cls.one)
        cls.other_student = user(UserRole.STUDENT, "other-student", cls.one)
        cls.parent = user(UserRole.PARENT, "parent", cls.one)
        cls.unlinked_parent = user(UserRole.PARENT, "unlinked-parent", cls.one)
        cls.other_admin = user(UserRole.ADMIN, "other-admin", cls.two)
        cls.other_teacher = user(UserRole.TEACHER, "other-teacher", cls.two)
        cls.cross_student = user(UserRole.STUDENT, "cross-student", cls.two)

        cls.department = Department.objects.create(institution=cls.one, name="Computing", code="LCSE")
        cls.course = Course.objects.create(
            institution=cls.one, department=cls.department, code="LCS", title="Learning Course"
        )
        cls.subject = Subject.objects.create(
            institution=cls.one, course=cls.course, code="L101", title="Learning Subject"
        )
        cls.batch = Batch.objects.create(institution=cls.one, course=cls.course, name="Learning A")
        cls.unrelated_batch = Batch.objects.create(
            institution=cls.one, course=cls.course, name="Learning B"
        )

        cls.other_department = Department.objects.create(
            institution=cls.two, name="Other", code="LOTH"
        )
        cls.other_course = Course.objects.create(
            institution=cls.two,
            department=cls.other_department,
            code="LOC",
            title="Other Course",
        )
        cls.other_subject = Subject.objects.create(
            institution=cls.two, course=cls.other_course, code="LO101", title="Other Subject"
        )
        cls.other_batch = Batch.objects.create(
            institution=cls.two, course=cls.other_course, name="Other Learning A"
        )

        TeacherAssignment.objects.create(
            batch=cls.batch, teacher=cls.teacher, subject=cls.subject, is_primary=True
        )
        TeacherAssignment.objects.create(
            batch=cls.other_batch, teacher=cls.other_teacher, subject=cls.other_subject
        )
        StudentEnrollment.objects.create(batch=cls.batch, student=cls.student)
        StudentEnrollment.objects.create(batch=cls.batch, student=cls.other_student)
        StudentEnrollment.objects.create(batch=cls.other_batch, student=cls.cross_student)
        ParentStudentLink.objects.create(
            parent=cls.parent, student=cls.student, relationship="Parent"
        )

        cls.session = AttendanceSession.objects.create(
            batch=cls.batch,
            subject=cls.subject,
            attendance_date=timezone.localdate() - timedelta(days=1),
            created_by=cls.teacher,
        )
        cls.record = AttendanceRecord.objects.create(
            session=cls.session,
            student=cls.student,
            status=AttendanceStatus.PRESENT,
            marked_by=cls.teacher,
        )
        cls.assignment = Assignment.objects.create(
            batch=cls.batch,
            subject=cls.subject,
            title="Published assignment",
            due_at=timezone.now() + timedelta(days=7),
            max_marks=20,
            status=AssignmentStatus.PUBLISHED,
            created_by=cls.teacher,
        )
        cls.draft_assignment = Assignment.objects.create(
            batch=cls.batch,
            subject=cls.subject,
            title="Draft assignment",
            due_at=timezone.now() + timedelta(days=7),
            max_marks=10,
            status=AssignmentStatus.DRAFT,
            created_by=cls.teacher,
        )
        cls.submission = Submission.objects.create(
            assignment=cls.assignment,
            student=cls.student,
            response="My answer",
            status=SubmissionStatus.SUBMITTED,
            submitted_at=timezone.now(),
        )


class LearningModelIntegrityTests(LearningFixtureMixin, TestCase):
    def test_model_validation_rejects_cross_tenant_and_unassigned_staff(self):
        with self.assertRaises(ValidationError):
            AttendanceSession.objects.create(
                batch=self.batch,
                subject=self.other_subject,
                attendance_date=timezone.localdate(),
                created_by=self.teacher,
            )
        with self.assertRaises(ValidationError):
            Assignment.objects.create(
                batch=self.unrelated_batch,
                subject=self.subject,
                title="Denied",
                due_at=timezone.now() + timedelta(days=1),
                max_marks=10,
                created_by=self.teacher,
            )

    def test_database_triggers_block_bulk_update_bypasses(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            AttendanceSession.objects.filter(pk=self.session.pk).update(batch=self.other_batch)
        with self.assertRaises(IntegrityError), transaction.atomic():
            AttendanceRecord.objects.filter(pk=self.record.pk).update(student=self.cross_student)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Assignment.objects.filter(pk=self.assignment.pk).update(created_by=self.unassigned_teacher)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Submission.objects.filter(pk=self.submission.pk).update(student=self.other_student)

    def test_database_trigger_blocks_late_submission_and_forged_grader(self):
        Assignment.objects.filter(pk=self.assignment.pk).update(due_at=timezone.now() - timedelta(seconds=1))
        with self.assertRaises(IntegrityError), transaction.atomic():
            Submission.objects.create(
                assignment=self.assignment,
                student=self.other_student,
                status=SubmissionStatus.DRAFT,
            )
        self.assignment.refresh_from_db()
        Assignment.objects.filter(pk=self.assignment.pk).update(due_at=timezone.now() + timedelta(days=1))
        with self.assertRaises(IntegrityError), transaction.atomic():
            Submission.objects.filter(pk=self.submission.pk).update(
                status=SubmissionStatus.GRADED,
                marks=10,
                graded_by=self.unassigned_teacher,
                graded_at=timezone.now(),
            )

    def test_uniqueness_and_submission_state_constraints(self):
        with self.assertRaises(ValidationError):
            AttendanceRecord.objects.create(
                session=self.session,
                student=self.student,
                status=AttendanceStatus.ABSENT,
                marked_by=self.teacher,
            )
        with self.assertRaises(ValidationError):
            Submission.objects.create(
                assignment=self.assignment,
                student=self.other_student,
                status=SubmissionStatus.SUBMITTED,
            )


class LearningApiTests(LearningFixtureMixin, APITestCase):
    @staticmethod
    def ids(response):
        return {item["id"] for item in response.data}

    def test_visibility_matrix_for_sessions_assignments_and_submissions(self):
        for actor in (self.super_admin, self.admin, self.teacher, self.student, self.parent):
            with self.subTest(actor=actor.email):
                self.client.force_authenticate(actor)
                self.assertIn(str(self.session.id), self.ids(self.client.get(reverse("attendance-session-list"))))
                self.assertIn(str(self.assignment.id), self.ids(self.client.get(reverse("learning-assignment-list"))))
        for actor in (self.product, self.unassigned_teacher, self.unlinked_parent):
            with self.subTest(actor=actor.email):
                self.client.force_authenticate(actor)
                self.assertEqual(self.client.get(reverse("attendance-session-list")).data, [])
                self.assertEqual(self.client.get(reverse("submission-list")).data, [])

        self.client.force_authenticate(self.student)
        assignment_ids = self.ids(self.client.get(reverse("learning-assignment-list")))
        self.assertEqual(assignment_ids, {str(self.assignment.id)})
        self.client.force_authenticate(self.parent)
        self.assertEqual(self.ids(self.client.get(reverse("submission-list"))), {str(self.submission.id)})

    def test_parent_attendance_records_include_only_linked_child(self):
        other_record = AttendanceRecord.objects.create(
            session=self.session,
            student=self.other_student,
            status=AttendanceStatus.ABSENT,
            marked_by=self.teacher,
        )
        self.client.force_authenticate(self.parent)
        response = self.client.get(reverse("attendance-record-list"))
        self.assertEqual({item["student"] for item in response.data}, {self.student.id})
        self.assertEqual(
            self.client.get(reverse("attendance-record-detail", args=(other_record.id,))).status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.client.force_authenticate(self.student)
        self.assertEqual(
            self.client.get(reverse("attendance-record-detail", args=(other_record.id,))).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_teacher_creates_session_and_assignment_for_assigned_batch(self):
        self.client.force_authenticate(self.teacher)
        session = self.client.post(
            reverse("attendance-session-list"),
            {
                "batch": self.batch.id,
                "subject": self.subject.id,
                "attendance_date": timezone.localdate(),
                "status": "open",
            },
            format="json",
        )
        assignment = self.client.post(
            reverse("learning-assignment-list"),
            {
                "batch": self.batch.id,
                "subject": self.subject.id,
                "title": "API assignment",
                "due_at": timezone.now() + timedelta(days=2),
                "max_marks": "15.00",
                "status": "published",
            },
            format="json",
        )
        self.assertEqual(session.status_code, status.HTTP_201_CREATED)
        self.assertEqual(assignment.status_code, status.HTTP_201_CREATED)
        self.assertEqual(session.data["created_by"], str(self.teacher.id))

    def test_unassigned_teacher_cannot_manage_unrelated_batch(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            reverse("learning-assignment-list"),
            {
                "batch": self.unrelated_batch.id,
                "subject": self.subject.id,
                "title": "Denied",
                "due_at": timezone.now() + timedelta(days=2),
                "max_marks": 10,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_students_and_parents_cannot_modify_staff_records(self):
        for actor in (self.student, self.parent):
            with self.subTest(actor=actor.role):
                self.client.force_authenticate(actor)
                response = self.client.patch(
                    reverse("attendance-session-detail", args=(self.session.id,)),
                    {"notes": "tampered"},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_creates_own_submission_and_cannot_choose_owner_or_grade(self):
        second = Assignment.objects.create(
            batch=self.batch,
            subject=self.subject,
            title="Second assignment",
            due_at=timezone.now() + timedelta(days=2),
            max_marks=10,
            status=AssignmentStatus.PUBLISHED,
            created_by=self.teacher,
        )
        self.client.force_authenticate(self.other_student)
        tampered = self.client.post(
            reverse("submission-list"),
            {
                "assignment": second.id,
                "student": self.student.id,
                "response": "Answer",
                "status": "submitted",
                "marks": 10,
            },
            format="json",
        )
        self.assertEqual(tampered.status_code, status.HTTP_400_BAD_REQUEST)
        created = self.client.post(
            reverse("submission-list"),
            {"assignment": second.id, "response": "Answer", "status": "submitted"},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["student"], str(self.other_student.id))
        self.assertIsNotNone(created.data["submitted_at"])
        grade = self.client.post(
            reverse("submission-grade", args=(created.data["id"],)), {"marks": 8}, format="json"
        )
        self.assertEqual(grade.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_submit_after_deadline_or_to_draft_assignment(self):
        expired = Assignment.objects.create(
            batch=self.batch,
            subject=self.subject,
            title="Expired",
            due_at=timezone.now() - timedelta(seconds=1),
            max_marks=10,
            status=AssignmentStatus.PUBLISHED,
            created_by=self.teacher,
        )
        self.client.force_authenticate(self.other_student)
        for assignment in (expired, self.draft_assignment):
            with self.subTest(assignment=assignment.title):
                response = self.client.post(
                    reverse("submission-list"),
                    {"assignment": assignment.id, "response": "Late", "status": "submitted"},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_teacher_grades_submitted_work_with_server_controlled_audit_fields(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            reverse("submission-grade", args=(self.submission.id,)),
            {"marks": "18.00", "feedback": "Good", "graded_by": self.admin.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(
            reverse("submission-grade", args=(self.submission.id,)),
            {"marks": "18.00", "feedback": "Good"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.submission.refresh_from_db()
        self.assertEqual(self.submission.status, SubmissionStatus.GRADED)
        self.assertEqual(self.submission.graded_by, self.teacher)
        self.assertEqual(self.submission.response, "My answer")

    def test_grade_bounds_and_draft_state_are_enforced(self):
        draft_submission = Submission.objects.create(
            assignment=self.assignment, student=self.other_student, status=SubmissionStatus.DRAFT
        )
        self.client.force_authenticate(self.teacher)
        too_high = self.client.post(
            reverse("submission-grade", args=(self.submission.id,)), {"marks": 21}, format="json"
        )
        draft = self.client.post(
            reverse("submission-grade", args=(draft_submission.id,)), {"marks": 5}, format="json"
        )
        self.assertEqual(too_high.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(draft.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_tenant_and_unrelated_idor_returns_not_found(self):
        other_assignment = Assignment.objects.create(
            batch=self.other_batch,
            subject=self.other_subject,
            title="Other assignment",
            due_at=timezone.now() + timedelta(days=1),
            max_marks=10,
            status=AssignmentStatus.PUBLISHED,
            created_by=self.other_teacher,
        )
        self.client.force_authenticate(self.admin)
        self.assertEqual(
            self.client.get(reverse("learning-assignment-detail", args=(other_assignment.id,))).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.client.force_authenticate(self.unassigned_teacher)
        self.assertEqual(
            self.client.get(reverse("submission-detail", args=(self.submission.id,))).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.post(
                reverse("submission-grade", args=(self.submission.id,)),
                {"marks": 10},
                format="json",
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_created_by_and_identity_tampering_are_rejected(self):
        self.client.force_authenticate(self.teacher)
        created_by = self.client.post(
            reverse("attendance-session-list"),
            {
                "batch": self.batch.id,
                "subject": self.subject.id,
                "attendance_date": timezone.localdate(),
                "created_by": self.admin.id,
            },
            format="json",
        )
        moved = self.client.patch(
            reverse("attendance-session-detail", args=(self.session.id,)),
            {"attendance_date": timezone.localdate() - timedelta(days=3)},
            format="json",
        )
        self.assertEqual(created_by.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(moved.status_code, status.HTTP_400_BAD_REQUEST)


class LearningDevelopmentFixtureTests(TestCase):
    def test_provision_command_creates_idempotent_learning_fixture(self):
        with patch.dict(os.environ, {"SKILLTOSS_TEST_USER_PASSWORD": PASSWORD}):
            call_command("provision_test_users", verbosity=0)
            call_command("provision_test_users", verbosity=0)

        self.assertEqual(AttendanceSession.objects.count(), 1)
        self.assertEqual(AttendanceRecord.objects.count(), 1)
        self.assertEqual(Assignment.objects.count(), 1)
        self.assertEqual(Submission.objects.count(), 1)
        submission = Submission.objects.get()
        self.assertEqual(submission.status, SubmissionStatus.GRADED)
        self.assertEqual(submission.marks, 18)
