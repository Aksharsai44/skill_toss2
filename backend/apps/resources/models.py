import uuid
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.accounts.models import UserRole
from apps.academics.models import BatchStatus, EnrollmentStatus, StudentEnrollment, TenantModel
from apps.learning.models import AssignmentStatus, SubmissionStatus

from .validators import MAX_FILE_SIZE


def _private_upload_path(kind, owner_id, filename):
    extension = Path(filename).suffix.lower()
    return f"private/{kind}/{owner_id}/{uuid.uuid4().hex}{extension}"


def note_upload_path(instance, filename):
    return _private_upload_path("student-notes", instance.note_id, filename)


def resource_upload_path(instance, filename):
    return _private_upload_path("learning-resources", instance.batch_id, filename)


def submission_upload_path(instance, filename):
    return _private_upload_path("assignment-submissions", instance.submission_id, filename)


def assignment_upload_path(instance, filename):
    return _private_upload_path("assignment-resources", instance.assignment_id, filename)


def _active_student(user, institution_id):
    return user.role == UserRole.STUDENT and user.is_active and user.institution_id == institution_id


class StudentNote(TenantModel):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="student_notes"
    )
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def derived_institution_id(self):
        return self.student.institution_id if self.student_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        if self.student_id and not _active_student(self.student, self.institution_id):
            errors["student"] = "Note owner must be an active Student in the same institution."
        if not (self.title or "").strip():
            errors["title"] = "Title cannot be blank."
        if errors:
            raise ValidationError(errors)


class PrivateFileModel(TenantModel):
    file_name = models.CharField(max_length=255, editable=False)
    mime_type = models.CharField(max_length=255, editable=False)
    file_size = models.PositiveBigIntegerField(editable=False)
    file = models.FileField(max_length=500, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True

    def clean(self):
        super().clean()
        if self.file_size <= 0 or self.file_size > MAX_FILE_SIZE:
            raise ValidationError({"file_size": "File must be between 1 byte and 10 MB."})
        if "/" in self.file_name or "\\" in self.file_name or not self.file_name:
            raise ValidationError({"file_name": "Stored display filename must be a safe basename."})


class NoteFile(PrivateFileModel):
    note = models.ForeignKey(StudentNote, on_delete=models.CASCADE, related_name="files")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="note_files"
    )
    file = models.FileField(upload_to=note_upload_path, max_length=500, editable=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("file",), name="resources_note_file_path_unique")]

    def derived_institution_id(self):
        return self.note.institution_id if self.note_id else self.institution_id

    def clean(self):
        super().clean()
        if self.note_id and (
            self.student_id != self.note.student_id or self.institution_id != self.note.institution_id
        ):
            raise ValidationError({"note": "File must belong to the note's Student."})


class LearningResource(PrivateFileModel):
    batch = models.ForeignKey(
        "academics.Batch", on_delete=models.CASCADE, related_name="learning_resources"
    )
    subject = models.ForeignKey(
        "academics.Subject", on_delete=models.PROTECT, related_name="learning_resources"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="uploaded_learning_resources"
    )
    file = models.FileField(upload_to=resource_upload_path, max_length=500, editable=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("file",), name="resources_learning_file_path_unique")
        ]
        indexes = [models.Index(fields=("batch", "created_at"))]

    def derived_institution_id(self):
        return self.batch.institution_id if self.batch_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        if not (self.title or "").strip():
            errors["title"] = "Title cannot be blank."
        if self.batch_id and self.batch.status != BatchStatus.ACTIVE:
            errors["batch"] = "Resource requires an active batch."
        if self.batch_id and self.subject_id and (
            self.subject.institution_id != self.institution_id
            or self.subject.course_id != self.batch.course_id
            or not self.subject.is_active
        ):
            errors["subject"] = "Subject must be active and belong to the batch course."
        if self.uploaded_by_id and self.uploaded_by.institution_id != self.institution_id:
            errors["uploaded_by"] = "Uploader and resource must share an institution."
        if errors:
            raise ValidationError(errors)


class AssignmentResource(PrivateFileModel):
    assignment = models.ForeignKey(
        "learning.Assignment", on_delete=models.CASCADE, related_name="files"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="uploaded_assignment_resources"
    )
    file = models.FileField(upload_to=assignment_upload_path, max_length=500, editable=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("file",), name="resources_assignment_file_path_unique")
        ]
        indexes = [models.Index(fields=("assignment", "created_at"))]

    def derived_institution_id(self):
        return self.assignment.institution_id if self.assignment_id else self.institution_id

    def clean(self):
        super().clean()
        if self.assignment_id and self.uploaded_by.institution_id != self.assignment.institution_id:
            raise ValidationError({"uploaded_by": "Uploader and assignment must share an institution."})


class SubmissionAttachment(PrivateFileModel):
    submission = models.ForeignKey(
        "learning.Submission", on_delete=models.CASCADE, related_name="files"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="uploaded_submission_files"
    )
    file = models.FileField(upload_to=submission_upload_path, max_length=500, editable=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("file",), name="resources_submission_file_path_unique")
        ]
        indexes = [models.Index(fields=("submission", "created_at"))]

    def derived_institution_id(self):
        return self.submission.institution_id if self.submission_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        if self.submission_id:
            if self.uploaded_by_id != self.submission.student_id:
                errors["uploaded_by"] = "Only the submission owner may upload its files."
            if self.submission.status == SubmissionStatus.GRADED:
                errors["submission"] = "A graded submission cannot receive files."
            assignment = self.submission.assignment
            if assignment.status != AssignmentStatus.PUBLISHED:
                errors["submission"] = "Submission files require a published assignment."
            if not StudentEnrollment.objects.filter(
                batch=assignment.batch,
                student=self.submission.student,
                status=EnrollmentStatus.ACTIVE,
            ).exists():
                errors["submission"] = "Student must be actively enrolled in the assignment batch."
        if errors:
            raise ValidationError(errors)


@receiver(post_delete, sender=NoteFile)
@receiver(post_delete, sender=LearningResource)
@receiver(post_delete, sender=AssignmentResource)
@receiver(post_delete, sender=SubmissionAttachment)
def delete_private_blob(sender, instance, **kwargs):
    if instance.file:
        instance.file.storage.delete(instance.file.name)
