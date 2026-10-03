from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import DatabaseError, IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Institution, User, UserRole
from apps.academics.models import (
    Batch, Course, Department, ParentStudentLink, StudentEnrollment, Subject, TeacherAssignment,
)

from .models import ActivityEvent, DailyGoal, DailyTask, GoalStatus, TaskStatus


PASSWORD = "Tracker-test-password-61!"


class TrackerFixtureMixin:
    @classmethod
    def setUpTestData(cls):
        cls.one = Institution.objects.create(name="Tracker One", code="TRK1")
        cls.two = Institution.objects.create(name="Tracker Two", code="TRK2")

        def user(role, label, institution):
            return User.objects.create_user(
                email=f"{label}@tracker.test", password=PASSWORD, full_name=label.title(),
                role=role, institution=institution, is_active=True,
            )

        cls.product = user(UserRole.PRODUCT_ADMIN, "product", None)
        cls.super_admin = user(UserRole.SUPER_ADMIN, "super", cls.one)
        cls.admin = user(UserRole.ADMIN, "admin", cls.one)
        cls.teacher = user(UserRole.TEACHER, "teacher", cls.one)
        cls.unassigned_teacher = user(UserRole.TEACHER, "unassigned", cls.one)
        cls.student = user(UserRole.STUDENT, "student", cls.one)
        cls.other_student = user(UserRole.STUDENT, "other-student", cls.one)
        cls.cross_student = user(UserRole.STUDENT, "cross-student", cls.two)
        cls.parent = user(UserRole.PARENT, "parent", cls.one)
        cls.unlinked_parent = user(UserRole.PARENT, "unlinked-parent", cls.one)

        department = Department.objects.create(institution=cls.one, name="Tracker", code="TRK")
        course = Course.objects.create(
            institution=cls.one, department=department, code="TRKC", title="Tracker Course"
        )
        cls.subject = Subject.objects.create(
            institution=cls.one, course=course, code="TRKS", title="Tracker Subject"
        )
        cls.batch = Batch.objects.create(institution=cls.one, course=course, name="Tracker A")
        TeacherAssignment.objects.create(
            batch=cls.batch, teacher=cls.teacher, subject=cls.subject
        )
        StudentEnrollment.objects.create(batch=cls.batch, student=cls.student)
        ParentStudentLink.objects.create(
            parent=cls.parent, student=cls.student, relationship="Parent"
        )

        cls.goal = DailyGoal.objects.create(
            student=cls.student, title="Read", category="Study", target="One chapter"
        )
        cls.other_goal = DailyGoal.objects.create(
            student=cls.other_student, title="Private", category="Study"
        )
        cls.cross_goal = DailyGoal.objects.create(
            student=cls.cross_student, title="Cross tenant", category="Study"
        )
        cls.task = DailyTask.objects.create(
            student=cls.student, goal=cls.goal, title="Read chapter one"
        )


class TrackerIntegrityTests(TrackerFixtureMixin, TestCase):
    def test_goal_and_task_completion_state_is_automatic(self):
        self.goal.status = GoalStatus.COMPLETED
        self.goal.save()
        self.assertIsNotNone(self.goal.completed_at)
        self.task.status = TaskStatus.COMPLETED
        self.task.save()
        self.assertIsNotNone(self.task.completed_at)
        self.assertTrue(
            ActivityEvent.objects.filter(student=self.student, event_type="goal_completed").exists()
        )
        self.assertTrue(
            ActivityEvent.objects.filter(student=self.student, event_type="task_completed").exists()
        )

    def test_task_cannot_reference_another_students_goal(self):
        with self.assertRaises(ValidationError):
            DailyTask.objects.create(
                student=self.student, goal=self.other_goal, title="Forged task"
            )

    def test_database_blocks_owner_bypass_and_forged_activity(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            DailyGoal.objects.filter(pk=self.goal.pk).update(student=self.cross_student)
        with self.assertRaises(DatabaseError), transaction.atomic():
            ActivityEvent.objects.create(
                student=self.student, event_type="goal_created", goal=self.goal
            )


class TrackerApiTests(TrackerFixtureMixin, APITestCase):
    @staticmethod
    def ids(response):
        return {item["id"] for item in response.data}

    def test_student_manages_only_own_tracker_and_activity_is_read_only(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.ids(self.client.get(reverse("daily-goal-list"))), {str(self.goal.id)})
        created = self.client.post(
            reverse("daily-goal-list"),
            {
                "title": "Practice", "category": "Study", "target": "30 minutes",
                "target_date": (timezone.localdate() + timedelta(days=1)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["student"], str(self.student.id))
        completed = self.client.patch(
            reverse("daily-goal-detail", args=(created.data["id"],)),
            {"status": "completed"}, format="json",
        )
        self.assertEqual(completed.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(completed.data["completed_at"])
        self.assertEqual(
            self.client.patch(
                reverse("daily-goal-detail", args=(self.other_goal.id,)),
                {"title": "IDOR"}, format="json",
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.post(reverse("activity-event-list"), {}, format="json").status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def test_student_cannot_forge_owner_or_cross_student_goal(self):
        self.client.force_authenticate(self.student)
        forged = self.client.post(
            reverse("daily-goal-list"),
            {"student": self.other_student.id, "institution": self.two.id, "title": "Forged", "category": "Study"},
            format="json",
        )
        task = self.client.post(
            reverse("daily-task-list"),
            {"goal": self.other_goal.id, "title": "Forged task", "activity_date": timezone.localdate()},
            format="json",
        )
        self.assertEqual(forged.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(task.status_code, status.HTTP_400_BAD_REQUEST)

    def test_teacher_parent_and_managers_have_scoped_read_only_access(self):
        expected = {
            self.teacher: {str(self.goal.id)},
            self.unassigned_teacher: set(),
            self.parent: {str(self.goal.id)},
            self.unlinked_parent: set(),
            self.admin: {str(self.goal.id), str(self.other_goal.id)},
            self.super_admin: {str(self.goal.id), str(self.other_goal.id)},
            self.product: set(),
        }
        for actor, goal_ids in expected.items():
            with self.subTest(actor=actor.email):
                self.client.force_authenticate(actor)
                response = self.client.get(reverse("daily-goal-list"))
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(self.ids(response), goal_ids)
                mutation = self.client.patch(
                    reverse("daily-goal-detail", args=(self.goal.id,)),
                    {"title": "Denied"}, format="json",
                )
                self.assertIn(mutation.status_code, {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND})

    def test_query_parameter_and_cross_tenant_ids_cannot_expand_scope(self):
        self.client.force_authenticate(self.parent)
        response = self.client.get(reverse("daily-goal-list"), {"student_id": self.other_student.id})
        self.assertEqual(response.data, [])
        self.client.force_authenticate(self.admin)
        self.assertEqual(
            self.client.get(reverse("daily-goal-detail", args=(self.cross_goal.id,))).status_code,
            status.HTTP_404_NOT_FOUND,
        )
