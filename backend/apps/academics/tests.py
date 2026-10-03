import os
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Institution, User, UserRole

from .models import (
    Batch,
    BatchStatus,
    Course,
    Department,
    EnrollmentStatus,
    ParentStudentLink,
    StudentEnrollment,
    Subject,
    TeacherAssignment,
)


PASSWORD = "Academic-test-password-61!"


class AcademicFixtureMixin:
    @classmethod
    def setUpTestData(cls):
        cls.one = Institution.objects.create(name="Institution One", code="ONE")
        cls.two = Institution.objects.create(name="Institution Two", code="TWO")

        def user(role, label, institution):
            return User.objects.create_user(
                email=f"{label}@example.test",
                password=PASSWORD,
                full_name=label.replace("-", " ").title(),
                role=role,
                institution=institution,
                is_active=True,
            )

        cls.product = user(UserRole.PRODUCT_ADMIN, "product", None)
        cls.super_admin = user(UserRole.SUPER_ADMIN, "super", cls.one)
        cls.admin = user(UserRole.ADMIN, "admin", cls.one)
        cls.other_admin = user(UserRole.ADMIN, "other-admin", cls.two)
        cls.teacher = user(UserRole.TEACHER, "teacher", cls.one)
        cls.unassigned_teacher = user(UserRole.TEACHER, "unassigned-teacher", cls.one)
        cls.other_teacher = user(UserRole.TEACHER, "other-teacher", cls.two)
        cls.student = user(UserRole.STUDENT, "student", cls.one)
        cls.unenrolled_student = user(UserRole.STUDENT, "unenrolled-student", cls.one)
        cls.other_student = user(UserRole.STUDENT, "other-student", cls.two)
        cls.parent = user(UserRole.PARENT, "parent", cls.one)
        cls.unlinked_parent = user(UserRole.PARENT, "unlinked-parent", cls.one)
        cls.other_parent = user(UserRole.PARENT, "other-parent", cls.two)

        cls.department = Department.objects.create(
            institution=cls.one, name="Computer Science", code="CSE"
        )
        cls.course = Course.objects.create(
            institution=cls.one,
            department=cls.department,
            code="BSC-CS",
            title="B.Sc. Computer Science",
        )
        cls.subject = Subject.objects.create(
            institution=cls.one, course=cls.course, code="CS101", title="Programming"
        )
        cls.visible_batch = Batch.objects.create(
            institution=cls.one, course=cls.course, name="CSE A", schedule="Morning"
        )
        cls.unrelated_batch = Batch.objects.create(
            institution=cls.one, course=cls.course, name="CSE B", schedule="Afternoon"
        )

        cls.other_department = Department.objects.create(
            institution=cls.two, name="Other Department", code="OD"
        )
        cls.other_course = Course.objects.create(
            institution=cls.two,
            department=cls.other_department,
            code="OTHER",
            title="Other Course",
        )
        cls.other_subject = Subject.objects.create(
            institution=cls.two, course=cls.other_course, code="OTH101", title="Other Subject"
        )
        cls.other_batch = Batch.objects.create(
            institution=cls.two, course=cls.other_course, name="Other A"
        )

        cls.assignment = TeacherAssignment.objects.create(
            institution=cls.one,
            batch=cls.visible_batch,
            teacher=cls.teacher,
            subject=cls.subject,
            is_primary=True,
        )
        cls.enrollment = StudentEnrollment.objects.create(
            institution=cls.one, batch=cls.visible_batch, student=cls.student
        )
        cls.parent_link = ParentStudentLink.objects.create(
            institution=cls.one,
            parent=cls.parent,
            student=cls.student,
            relationship="Parent",
            is_primary=True,
        )


class RelationshipIntegrityTests(AcademicFixtureMixin, TestCase):
    def test_invalid_user_roles_are_rejected(self):
        with self.assertRaises(ValidationError):
            TeacherAssignment.objects.create(batch=self.visible_batch, teacher=self.student)
        with self.assertRaises(ValidationError):
            StudentEnrollment.objects.create(batch=self.visible_batch, student=self.teacher)
        with self.assertRaises(ValidationError):
            ParentStudentLink.objects.create(
                parent=self.admin, student=self.unenrolled_student, relationship="Guardian"
            )
        with self.assertRaises(ValidationError):
            ParentStudentLink.objects.create(
                parent=self.unlinked_parent, student=self.teacher, relationship="Guardian"
            )

    def test_cross_institution_relationships_are_rejected(self):
        with self.assertRaises(ValidationError):
            TeacherAssignment.objects.create(batch=self.visible_batch, teacher=self.other_teacher)
        with self.assertRaises(ValidationError):
            StudentEnrollment.objects.create(batch=self.visible_batch, student=self.other_student)
        with self.assertRaises(ValidationError):
            ParentStudentLink.objects.create(
                parent=self.parent, student=self.other_student, relationship="Guardian"
            )

    def test_duplicate_relationships_are_rejected(self):
        with self.assertRaises(ValidationError):
            TeacherAssignment.objects.create(
                batch=self.visible_batch, teacher=self.teacher, subject=self.subject
            )
        with self.assertRaises(ValidationError):
            StudentEnrollment.objects.create(batch=self.visible_batch, student=self.student)
        with self.assertRaises(ValidationError):
            ParentStudentLink.objects.create(
                parent=self.parent, student=self.student, relationship="Parent"
            )

    def test_subject_must_belong_to_batch_course(self):
        with self.assertRaises(ValidationError):
            TeacherAssignment.objects.create(
                batch=self.visible_batch, teacher=self.unassigned_teacher, subject=self.other_subject
            )

    def test_archive_and_removal_state_constraints(self):
        self.visible_batch.archive()
        self.assertEqual(self.visible_batch.status, BatchStatus.ARCHIVED)
        self.assertIsNotNone(self.visible_batch.archived_at)
        self.enrollment.remove()
        self.assertEqual(self.enrollment.status, EnrollmentStatus.REMOVED)
        self.assertIsNotNone(self.enrollment.removed_at)

    def test_case_insensitive_catalog_and_active_batch_uniqueness(self):
        with self.assertRaises(ValidationError):
            Department.objects.create(institution=self.one, name="Duplicate", code="cse")
        Department.objects.create(institution=self.two, name="Allowed Other Tenant", code="cse")

        with self.assertRaises(ValidationError):
            Batch.objects.create(institution=self.one, course=self.course, name="cse a")
        self.visible_batch.archive()
        replacement = Batch.objects.create(institution=self.one, course=self.course, name="cse a")
        self.assertEqual(replacement.status, BatchStatus.ACTIVE)

    def test_database_triggers_block_bulk_update_bypasses(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            TeacherAssignment.objects.filter(pk=self.assignment.pk).update(teacher=self.student)
        with self.assertRaises(IntegrityError), transaction.atomic():
            StudentEnrollment.objects.filter(pk=self.enrollment.pk).update(student=self.teacher)
        with self.assertRaises(IntegrityError), transaction.atomic():
            ParentStudentLink.objects.filter(pk=self.parent_link.pk).update(parent=self.admin)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Batch.objects.filter(pk=self.visible_batch.pk).update(institution=self.two)
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.filter(pk=self.teacher.pk).update(role=UserRole.STUDENT)
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.filter(pk=self.student.pk).update(institution=self.two)


class AcademicApiTests(AcademicFixtureMixin, APITestCase):
    def ids(self, response):
        return {item["id"] for item in response.data}

    def test_batch_visibility_matches_all_six_roles(self):
        expected = {
            self.product: set(),
            self.super_admin: {str(self.visible_batch.id), str(self.unrelated_batch.id)},
            self.admin: {str(self.visible_batch.id), str(self.unrelated_batch.id)},
            self.teacher: {str(self.visible_batch.id)},
            self.student: {str(self.visible_batch.id)},
            self.parent: {str(self.visible_batch.id)},
        }
        for user, batch_ids in expected.items():
            with self.subTest(role=user.role):
                self.client.force_authenticate(user)
                response = self.client.get(reverse("batch-list"))
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(self.ids(response), batch_ids)

    def test_unassigned_and_unlinked_users_see_no_batches(self):
        for user in (self.unassigned_teacher, self.unenrolled_student, self.unlinked_parent):
            with self.subTest(user=user.email):
                self.client.force_authenticate(user)
                response = self.client.get(reverse("batch-list"))
                self.assertEqual(response.data, [])

    def test_super_admin_and_admin_are_tenant_scoped(self):
        for user in (self.super_admin, self.admin):
            with self.subTest(role=user.role):
                self.client.force_authenticate(user)
                response = self.client.get(reverse("batch-detail", args=(self.other_batch.id,)))
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_cannot_manage_another_institutions_batch(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            reverse("batch-detail", args=(self.other_batch.id,)), {"name": "Tampered"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.other_batch.refresh_from_db()
        self.assertEqual(self.other_batch.name, "Other A")

    def test_teacher_cannot_create_batch(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            reverse("batch-list"), {"course": self.course.id, "name": "Denied"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_creates_and_archives_batch_with_server_controlled_tenant(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            reverse("batch-list"),
            {"institution": self.two.id, "course": self.course.id, "name": "CSE C"},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        batch = Batch.objects.get(pk=created.data["id"])
        self.assertEqual(batch.institution_id, self.one.id)

        archived = self.client.patch(
            reverse("batch-detail", args=(batch.id,)), {"status": "archived"}, format="json"
        )
        self.assertEqual(archived.status_code, status.HTTP_200_OK)
        batch.refresh_from_db()
        self.assertEqual(batch.status, BatchStatus.ARCHIVED)
        self.assertIsNotNone(batch.archived_at)

    def test_admin_cannot_create_batch_for_cross_tenant_course(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            reverse("batch-list"), {"course": self.other_course.id, "name": "Denied"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_relationship_management_endpoints_validate_roles_and_tenants(self):
        self.client.force_authenticate(self.admin)
        invalid_teacher = self.client.post(
            reverse("teacher-assignment-list"),
            {"batch": self.unrelated_batch.id, "teacher": self.student.id},
            format="json",
        )
        cross_student = self.client.post(
            reverse("student-enrollment-list"),
            {"batch": self.unrelated_batch.id, "student": self.other_student.id},
            format="json",
        )
        invalid_parent = self.client.post(
            reverse("parent-student-link-list"),
            {
                "parent": self.admin.id,
                "student": self.unenrolled_student.id,
                "relationship": "Guardian",
            },
            format="json",
        )
        self.assertEqual(invalid_teacher.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(cross_student.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_parent.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_create_valid_relationships_inside_another_tenant(self):
        self.client.force_authenticate(self.admin)
        teacher = self.client.post(
            reverse("teacher-assignment-list"),
            {
                "batch": self.other_batch.id,
                "teacher": self.other_teacher.id,
                "subject": self.other_subject.id,
            },
            format="json",
        )
        enrollment = self.client.post(
            reverse("student-enrollment-list"),
            {"batch": self.other_batch.id, "student": self.other_student.id},
            format="json",
        )
        parent_link = self.client.post(
            reverse("parent-student-link-list"),
            {
                "parent": self.other_parent.id,
                "student": self.other_student.id,
                "relationship": "Parent",
            },
            format="json",
        )
        self.assertEqual(teacher.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(enrollment.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(parent_link.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_manages_teacher_enrollment_and_parent_link(self):
        self.client.force_authenticate(self.admin)
        teacher = self.client.post(
            reverse("teacher-assignment-list"),
            {
                "batch": self.unrelated_batch.id,
                "teacher": self.unassigned_teacher.id,
                "subject": self.subject.id,
                "is_primary": True,
            },
            format="json",
        )
        enrollment = self.client.post(
            reverse("student-enrollment-list"),
            {"batch": self.unrelated_batch.id, "student": self.unenrolled_student.id},
            format="json",
        )
        parent_link = self.client.post(
            reverse("parent-student-link-list"),
            {
                "parent": self.unlinked_parent.id,
                "student": self.unenrolled_student.id,
                "relationship": "Guardian",
            },
            format="json",
        )
        self.assertEqual(teacher.status_code, status.HTTP_201_CREATED)
        self.assertEqual(enrollment.status_code, status.HTTP_201_CREATED)
        self.assertEqual(parent_link.status_code, status.HTTP_201_CREATED)

        deactivated = self.client.patch(
            reverse("teacher-assignment-detail", args=(teacher.data["id"],)),
            {"is_active": False},
            format="json",
        )
        removed = self.client.patch(
            reverse("student-enrollment-detail", args=(enrollment.data["id"],)),
            {"status": "removed"},
            format="json",
        )
        self.assertEqual(deactivated.status_code, status.HTTP_200_OK)
        self.assertEqual(removed.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(removed.data["removed_at"])

    def test_related_users_cannot_retrieve_unrelated_batch(self):
        for user in (self.teacher, self.student, self.parent):
            with self.subTest(role=user.role):
                self.client.force_authenticate(user)
                response = self.client.get(reverse("batch-detail", args=(self.unrelated_batch.id,)))
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_product_admin_gets_institution_metadata_but_no_academic_catalog(self):
        self.client.force_authenticate(self.product)
        institutions = self.client.get(reverse("institution-list"))
        departments = self.client.get(reverse("department-list"))
        self.assertEqual(institutions.status_code, status.HTTP_200_OK)
        self.assertEqual(len(institutions.data), 2)
        self.assertEqual(departments.data, [])

    def test_catalog_endpoints_are_tenant_scoped(self):
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.ids(self.client.get(reverse("department-list"))), {str(self.department.id)})
        self.assertEqual(self.ids(self.client.get(reverse("course-list"))), {str(self.course.id)})
        self.assertEqual(self.ids(self.client.get(reverse("subject-list"))), {str(self.subject.id)})

    def test_batch_nested_enrollments_do_not_leak_to_parent(self):
        second_student = User.objects.create_user(
            email="second@example.test",
            password=PASSWORD,
            full_name="Second Student",
            role=UserRole.STUDENT,
            institution=self.one,
            is_active=True,
        )
        StudentEnrollment.objects.create(batch=self.visible_batch, student=second_student)
        self.client.force_authenticate(self.parent)
        response = self.client.get(reverse("batch-detail", args=(self.visible_batch.id,)))
        student_ids = {item["student_details"]["id"] for item in response.data["students"]}
        self.assertEqual(student_ids, {str(self.student.id)})


class DevelopmentFixtureTests(TestCase):
    def test_provision_command_creates_complete_idempotent_academic_fixture(self):
        with patch.dict(os.environ, {"SKILLTOSS_TEST_USER_PASSWORD": PASSWORD}):
            call_command("provision_test_users", verbosity=0)
            call_command("provision_test_users", verbosity=0)

        self.assertEqual(Institution.objects.count(), 2)
        self.assertEqual(User.objects.filter(email__endswith="@skilltoss.test").count(), 6)
        self.assertEqual(Department.objects.count(), 1)
        self.assertEqual(Course.objects.count(), 1)
        self.assertEqual(Subject.objects.count(), 1)
        self.assertEqual(Batch.objects.count(), 1)
        self.assertEqual(TeacherAssignment.objects.count(), 1)
        self.assertEqual(StudentEnrollment.objects.count(), 1)
        self.assertEqual(ParentStudentLink.objects.count(), 1)
