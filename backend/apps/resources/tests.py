import os
import shutil
import tempfile
from datetime import timedelta
from unittest.mock import patch

from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Institution, User, UserRole
from apps.academics.models import (
    Batch, Course, Department, ParentStudentLink, StudentEnrollment, Subject, TeacherAssignment,
)
from apps.learning.models import Assignment, AssignmentStatus, Submission, SubmissionStatus
from apps.tracker.models import ActivityEvent, DailyGoal, DailyTask

from .models import AssignmentResource, LearningResource, NoteFile, StudentNote, SubmissionAttachment
from .validators import MAX_FILE_SIZE


PASSWORD = "Resource-test-password-61!"
TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="skilltoss-test-media-")


def tearDownModule():
    shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)


def text_upload(name="safe.txt", content=b"Safe SkillToss text file\n"):
    return SimpleUploadedFile(name, content, content_type="text/plain")


class ResourceFixtureMixin:
    @classmethod
    def setUpTestData(cls):
        cls.one = Institution.objects.create(name="Resource One", code="RES1")
        cls.two = Institution.objects.create(name="Resource Two", code="RES2")

        def user(role, label, institution):
            return User.objects.create_user(
                email=f"{label}@resource.test", password=PASSWORD, full_name=label.title(),
                role=role, institution=institution, is_active=True,
            )

        cls.product = user(UserRole.PRODUCT_ADMIN, "product", None)
        cls.admin = user(UserRole.ADMIN, "admin", cls.one)
        cls.super_admin = user(UserRole.SUPER_ADMIN, "super", cls.one)
        cls.teacher = user(UserRole.TEACHER, "teacher", cls.one)
        cls.unassigned_teacher = user(UserRole.TEACHER, "unassigned", cls.one)
        cls.other_teacher = user(UserRole.TEACHER, "other-teacher", cls.two)
        cls.student = user(UserRole.STUDENT, "student", cls.one)
        cls.other_student = user(UserRole.STUDENT, "other-student", cls.one)
        cls.cross_student = user(UserRole.STUDENT, "cross-student", cls.two)
        cls.parent = user(UserRole.PARENT, "parent", cls.one)
        cls.unlinked_parent = user(UserRole.PARENT, "unlinked-parent", cls.one)

        department = Department.objects.create(institution=cls.one, name="Resources", code="RES")
        course = Course.objects.create(
            institution=cls.one, department=department, code="RESC", title="Resource Course"
        )
        cls.subject = Subject.objects.create(
            institution=cls.one, course=course, code="RESS", title="Resource Subject"
        )
        cls.batch = Batch.objects.create(institution=cls.one, course=course, name="Resource A")
        cls.unrelated_batch = Batch.objects.create(
            institution=cls.one, course=course, name="Resource B"
        )

        other_department = Department.objects.create(
            institution=cls.two, name="Other Resources", code="ORES"
        )
        other_course = Course.objects.create(
            institution=cls.two, department=other_department, code="ORESC", title="Other Course"
        )
        cls.other_subject = Subject.objects.create(
            institution=cls.two, course=other_course, code="ORESS", title="Other Subject"
        )
        cls.other_batch = Batch.objects.create(
            institution=cls.two, course=other_course, name="Other Resource A"
        )

        TeacherAssignment.objects.create(batch=cls.batch, teacher=cls.teacher, subject=cls.subject)
        TeacherAssignment.objects.create(
            batch=cls.other_batch, teacher=cls.other_teacher, subject=cls.other_subject
        )
        StudentEnrollment.objects.create(batch=cls.batch, student=cls.student)
        StudentEnrollment.objects.create(batch=cls.batch, student=cls.other_student)
        StudentEnrollment.objects.create(batch=cls.other_batch, student=cls.cross_student)
        ParentStudentLink.objects.create(
            parent=cls.parent, student=cls.student, relationship="Parent"
        )

        cls.assignment = Assignment.objects.create(
            batch=cls.batch, subject=cls.subject, title="Resource assignment",
            due_at=timezone.now() + timedelta(days=7), max_marks=10,
            status=AssignmentStatus.PUBLISHED, created_by=cls.teacher,
        )
        cls.submission = Submission.objects.create(
            assignment=cls.assignment, student=cls.student, response="Response",
            status=SubmissionStatus.SUBMITTED, submitted_at=timezone.now(),
        )
        cls.other_submission = Submission.objects.create(
            assignment=cls.assignment, student=cls.other_student, response="Other response",
            status=SubmissionStatus.SUBMITTED, submitted_at=timezone.now(),
        )
        cls.note = StudentNote.objects.create(student=cls.student, title="Private note", content="Private")
        cls.other_note = StudentNote.objects.create(
            student=cls.other_student, title="Other note", content="Other private"
        )


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class ResourceApiTests(ResourceFixtureMixin, APITestCase):
    def upload_resource(self, actor=None, batch=None, subject=None, file=None, **extra):
        self.client.force_authenticate(actor or self.teacher)
        data = {
            "batch": (batch or self.batch).id,
            "subject": (subject or self.subject).id,
            "title": "Uploaded guide",
            "description": "A safe guide",
            "file": file or text_upload(),
            **extra,
        }
        return self.client.post(reverse("learning-resource-list"), data, format="multipart")

    def test_teacher_uploads_and_authorized_roles_download_private_resource(self):
        created = self.upload_resource()
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("file", created.data)
        self.assertNotIn("storage_path", created.data)
        resource = LearningResource.objects.get(pk=created.data["id"])
        self.assertTrue(resource.file.name.startswith("private/learning-resources/"))

        for actor in (self.teacher, self.admin, self.super_admin, self.student, self.parent):
            with self.subTest(actor=actor.email):
                self.client.force_authenticate(actor)
                downloaded = self.client.get(reverse("learning-resource-download", args=(resource.id,)))
                self.assertEqual(downloaded.status_code, status.HTTP_200_OK)
                self.assertEqual(b"".join(downloaded.streaming_content), b"Safe SkillToss text file\n")

        self.client.force_authenticate(self.unassigned_teacher)
        self.assertEqual(
            self.client.get(reverse("learning-resource-download", args=(resource.id,))).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.client.force_authenticate(self.product)
        self.assertEqual(self.client.get(reverse("learning-resource-list")).data, [])

    def test_student_and_unassigned_teacher_cannot_upload_resource(self):
        self.assertEqual(self.upload_resource(actor=self.student).status_code, status.HTTP_403_FORBIDDEN)
        denied = self.upload_resource(actor=self.unassigned_teacher, batch=self.unrelated_batch)
        self.assertEqual(denied.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_note_and_note_file_remain_owner_private(self):
        self.client.force_authenticate(self.student)
        uploaded = self.client.post(
            reverse("note-file-list"), {"note": self.note.id, "file": text_upload()}, format="multipart"
        )
        self.assertEqual(uploaded.status_code, status.HTTP_201_CREATED)
        for actor in (self.teacher, self.parent, self.admin, self.product, self.other_student):
            with self.subTest(actor=actor.email):
                self.client.force_authenticate(actor)
                note_ids = {
                    item["id"] for item in self.client.get(reverse("student-note-list")).data
                }
                self.assertNotIn(str(self.note.id), note_ids)
                self.assertEqual(
                    self.client.get(reverse("note-file-download", args=(uploaded.data["id"],))).status_code,
                    status.HTTP_404_NOT_FOUND,
                )

    def test_submission_file_owner_upload_and_linked_read_matrix(self):
        self.client.force_authenticate(self.student)
        uploaded = self.client.post(
            reverse("submission-file-list"),
            {"submission": self.submission.id, "file": text_upload("answer.txt")},
            format="multipart",
        )
        self.assertEqual(uploaded.status_code, status.HTTP_201_CREATED)
        for actor in (self.student, self.parent, self.teacher, self.admin, self.super_admin):
            with self.subTest(actor=actor.email):
                self.client.force_authenticate(actor)
                self.assertEqual(
                    self.client.get(reverse("submission-file-download", args=(uploaded.data["id"],))).status_code,
                    status.HTTP_200_OK,
                )

    def test_assignment_resource_is_staff_uploaded_and_assignment_scoped(self):
        self.client.force_authenticate(self.teacher)
        uploaded = self.client.post(
            reverse("assignment-resource-list"),
            {"assignment": self.assignment.id, "file": text_upload("brief.txt")},
            format="multipart",
        )
        self.assertEqual(uploaded.status_code, status.HTTP_201_CREATED)
        for actor in (self.student, self.parent, self.teacher, self.admin):
            with self.subTest(actor=actor.email):
                self.client.force_authenticate(actor)
                self.assertEqual(
                    self.client.get(
                        reverse("assignment-resource-download", args=(uploaded.data["id"],))
                    ).status_code,
                    status.HTTP_200_OK,
                )
        self.client.force_authenticate(self.student)
        self.assertEqual(
            self.client.post(
                reverse("assignment-resource-list"),
                {"assignment": self.assignment.id, "file": text_upload("forged.txt")},
                format="multipart",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.delete(
                reverse("assignment-resource-detail", args=(uploaded.data["id"],))
            ).status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        for actor in (self.other_student, self.unlinked_parent, self.unassigned_teacher, self.product):
            with self.subTest(actor=actor.email):
                self.client.force_authenticate(actor)
                self.assertEqual(
                    self.client.get(reverse("submission-file-download", args=(uploaded.data["id"],))).status_code,
                    status.HTTP_404_NOT_FOUND,
                )

    def test_spoofed_owner_uploader_and_cross_student_submission_are_rejected(self):
        spoofed_resource = self.upload_resource(uploaded_by=self.admin.id, institution=self.two.id)
        self.assertEqual(spoofed_resource.status_code, status.HTTP_400_BAD_REQUEST)
        self.client.force_authenticate(self.student)
        spoofed_submission = self.client.post(
            reverse("submission-file-list"),
            {
                "submission": self.submission.id, "file": text_upload(),
                "uploaded_by": self.teacher.id,
            },
            format="multipart",
        )
        cross_student = self.client.post(
            reverse("submission-file-list"),
            {"submission": self.other_submission.id, "file": text_upload("other.txt")},
            format="multipart",
        )
        self.assertEqual(spoofed_submission.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(cross_student.status_code, status.HTTP_400_BAD_REQUEST)

    def test_file_attack_validation(self):
        attacks = (
            SimpleUploadedFile("malware.exe", b"MZ executable", content_type="application/octet-stream"),
            SimpleUploadedFile("spoofed.pdf", b"MZ executable", content_type="application/pdf"),
            SimpleUploadedFile("oversized.txt", b"a" * (MAX_FILE_SIZE + 1), content_type="text/plain"),
        )
        for upload in attacks:
            with self.subTest(name=upload.name):
                response = self.upload_resource(file=upload)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        traversal = self.upload_resource(file=text_upload("../../nested/evil.txt"))
        self.assertEqual(traversal.status_code, status.HTTP_201_CREATED)
        resource = LearningResource.objects.get(pk=traversal.data["id"])
        self.assertNotIn("..", resource.file_name)
        self.assertNotIn("/", resource.file_name)
        self.assertNotIn("..", resource.file.name)

    def test_direct_media_url_and_cross_tenant_file_id_are_not_public(self):
        resource = LearningResource.objects.create(
            batch=self.other_batch, subject=self.other_subject, title="Cross tenant",
            description="Private", uploaded_by=self.other_teacher, file_name="cross.txt",
            mime_type="text/plain", file_size=6, file=ContentFile(b"cross\n", name="cross.txt"),
        )
        self.client.force_authenticate(self.admin)
        self.assertEqual(
            self.client.get(reverse("learning-resource-detail", args=(resource.id,))).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(self.client.get(resource.file.url).status_code, status.HTTP_404_NOT_FOUND)

    def test_parent_cannot_modify_resources_or_files(self):
        created = self.upload_resource()
        self.client.force_authenticate(self.parent)
        self.assertEqual(
            self.client.delete(
                reverse("learning-resource-detail", args=(created.data["id"],))
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(
                reverse("note-file-list"), {"note": self.note.id, "file": text_upload()}, format="multipart"
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class ResourceIntegrityTests(ResourceFixtureMixin, TestCase):
    def test_database_blocks_cross_tenant_metadata_bypass(self):
        resource = LearningResource.objects.create(
            batch=self.batch, subject=self.subject, title="Safe resource", description="Safe",
            uploaded_by=self.teacher, file_name="safe.txt", mime_type="text/plain", file_size=5,
            file=ContentFile(b"safe\n", name="safe.txt"),
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            LearningResource.objects.filter(pk=resource.pk).update(batch=self.other_batch)
        with self.assertRaises(IntegrityError), transaction.atomic():
            StudentNote.objects.filter(pk=self.note.pk).update(student=self.cross_student)


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class PhaseFourDevelopmentFixtureTests(TestCase):
    def test_provision_command_creates_idempotent_phase_four_fixture(self):
        with patch.dict(os.environ, {"SKILLTOSS_TEST_USER_PASSWORD": PASSWORD}):
            call_command("provision_test_users", verbosity=0)
            call_command("provision_test_users", verbosity=0)

        self.assertEqual(DailyGoal.objects.count(), 1)
        self.assertEqual(DailyTask.objects.count(), 1)
        self.assertGreaterEqual(ActivityEvent.objects.count(), 2)
        self.assertEqual(StudentNote.objects.count(), 1)
        self.assertEqual(NoteFile.objects.count(), 1)
        self.assertEqual(LearningResource.objects.count(), 1)
        self.assertTrue(NoteFile.objects.get().file.storage.exists(NoteFile.objects.get().file.name))
