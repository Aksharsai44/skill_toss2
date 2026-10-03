from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.accounts.models import UserRole
from apps.academics.models import (
    BatchStatus,
    EnrollmentStatus,
    StudentEnrollment,
    TeacherAssignment,
    TenantModel,
)


ACADEMIC_STAFF_ROLES = {UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER}


def _staff_can_manage_batch(user, batch):
    if not user or not user.is_active or user.institution_id != batch.institution_id:
        return False
    if user.role in {UserRole.SUPER_ADMIN, UserRole.ADMIN}:
        return True
    return user.role == UserRole.TEACHER and TeacherAssignment.objects.filter(
        batch=batch, teacher=user, is_active=True
    ).exists()


def _validate_batch_subject_actor(instance, errors):
    if instance.batch_id:
        if instance.batch.status != BatchStatus.ACTIVE:
            errors["batch"] = "Learning records require an active batch."
        if instance.institution_id != instance.batch.institution_id:
            errors["batch"] = "Batch and record must share an institution."
    if instance.subject_id and instance.batch_id:
        if (
            instance.subject.institution_id != instance.institution_id
            or instance.subject.course_id != instance.batch.course_id
            or not instance.subject.is_active
        ):
            errors["subject"] = "Subject must be active and belong to the batch course."
    if instance.created_by_id:
        if instance.created_by.role not in ACADEMIC_STAFF_ROLES:
            errors["created_by"] = "Creator must be academic staff."
        elif not _staff_can_manage_batch(instance.created_by, instance.batch):
            errors["created_by"] = "Creator is not allowed to manage this batch."


class AttendanceSessionStatus(models.TextChoices):
    OPEN = "open", "Open"
    CLOSED = "closed", "Closed"


class AttendanceSession(TenantModel):
    batch = models.ForeignKey(
        "academics.Batch", on_delete=models.PROTECT, related_name="attendance_sessions"
    )
    subject = models.ForeignKey(
        "academics.Subject", on_delete=models.PROTECT, related_name="attendance_sessions"
    )
    attendance_date = models.DateField()
    status = models.CharField(
        max_length=16, choices=AttendanceSessionStatus.choices, default=AttendanceSessionStatus.OPEN
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_attendance_sessions"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("batch", "subject", "attendance_date"),
                name="learning_attendance_session_unique",
            )
        ]
        indexes = [models.Index(fields=("batch", "attendance_date"))]

    def derived_institution_id(self):
        return self.batch.institution_id if self.batch_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        _validate_batch_subject_actor(self, errors)
        if errors:
            raise ValidationError(errors)


class AttendanceStatus(models.TextChoices):
    PRESENT = "present", "Present"
    ABSENT = "absent", "Absent"
    LATE = "late", "Late"
    EXCUSED = "excused", "Excused"


class AttendanceRecord(TenantModel):
    session = models.ForeignKey(
        AttendanceSession, on_delete=models.CASCADE, related_name="records"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="attendance_records"
    )
    status = models.CharField(max_length=16, choices=AttendanceStatus.choices)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="marked_attendance_records"
    )
    marked_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("session", "student"), name="learning_attendance_record_unique"
            )
        ]
        indexes = [models.Index(fields=("student",))]

    def derived_institution_id(self):
        return self.session.institution_id if self.session_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        if self.session_id:
            if self.session.status != AttendanceSessionStatus.OPEN:
                errors["session"] = "Attendance can only be marked in an open session."
            if self.institution_id != self.session.institution_id:
                errors["session"] = "Session and record must share an institution."
        if self.student_id:
            if (
                self.student.role != UserRole.STUDENT
                or not self.student.is_active
                or self.student.institution_id != self.institution_id
            ):
                errors["student"] = "Attendance requires an active student in the same institution."
            elif self.session_id and not StudentEnrollment.objects.filter(
                batch=self.session.batch, student=self.student, status=EnrollmentStatus.ACTIVE
            ).exists():
                errors["student"] = "Student must have an active enrollment in the session batch."
        if self.marked_by_id and self.session_id and not _staff_can_manage_batch(
            self.marked_by, self.session.batch
        ):
            errors["marked_by"] = "Marker is not allowed to manage this batch."
        if errors:
            raise ValidationError(errors)


class AssignmentStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class Assignment(TenantModel):
    batch = models.ForeignKey(
        "academics.Batch", on_delete=models.PROTECT, related_name="learning_assignments"
    )
    subject = models.ForeignKey(
        "academics.Subject", on_delete=models.PROTECT, related_name="learning_assignments"
    )
    title = models.CharField(max_length=255)
    instructions = models.TextField(blank=True)
    due_at = models.DateTimeField()
    max_marks = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(
        max_length=16, choices=AssignmentStatus.choices, default=AssignmentStatus.DRAFT
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_learning_assignments"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(max_marks__gt=0), name="learning_assignment_positive_max_marks"
            )
        ]
        indexes = [models.Index(fields=("batch", "due_at"))]

    def derived_institution_id(self):
        return self.batch.institution_id if self.batch_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        _validate_batch_subject_actor(self, errors)
        if not (self.title or "").strip():
            errors["title"] = "Title cannot be blank."
        if self.max_marks is not None and self.max_marks <= 0:
            errors["max_marks"] = "Maximum marks must be greater than zero."
        if errors:
            raise ValidationError(errors)


class SubmissionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    GRADED = "graded", "Graded"


class Submission(TenantModel):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="learning_submissions"
    )
    response = models.TextField(blank=True)
    status = models.CharField(
        max_length=16, choices=SubmissionStatus.choices, default=SubmissionStatus.DRAFT
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    marks = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="graded_learning_submissions",
    )
    graded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("assignment", "student"), name="learning_assignment_student_unique"
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        status=SubmissionStatus.DRAFT,
                        submitted_at__isnull=True,
                        marks__isnull=True,
                        graded_at__isnull=True,
                        graded_by__isnull=True,
                    )
                    | models.Q(
                        status=SubmissionStatus.SUBMITTED,
                        submitted_at__isnull=False,
                        marks__isnull=True,
                        graded_at__isnull=True,
                        graded_by__isnull=True,
                    )
                    | models.Q(
                        status=SubmissionStatus.GRADED,
                        submitted_at__isnull=False,
                        marks__isnull=False,
                        graded_at__isnull=False,
                        graded_by__isnull=False,
                    )
                ),
                name="learning_submission_state_consistent",
            ),
            models.CheckConstraint(
                condition=models.Q(marks__isnull=True) | models.Q(marks__gte=0),
                name="learning_submission_nonnegative_marks",
            ),
        ]
        indexes = [models.Index(fields=("student", "status"))]

    def derived_institution_id(self):
        return self.assignment.institution_id if self.assignment_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        if self.assignment_id and self.institution_id != self.assignment.institution_id:
            errors["assignment"] = "Assignment and submission must share an institution."
        if self.student_id:
            if (
                self.student.role != UserRole.STUDENT
                or not self.student.is_active
                or self.student.institution_id != self.institution_id
            ):
                errors["student"] = "Submission requires an active student in the same institution."
            elif self.assignment_id and not StudentEnrollment.objects.filter(
                batch=self.assignment.batch,
                student=self.student,
                status=EnrollmentStatus.ACTIVE,
            ).exists():
                errors["student"] = "Student must have an active enrollment in the assignment batch."
        state_valid = (
            self.status == SubmissionStatus.DRAFT
            and self.submitted_at is None
            and self.marks is None
            and self.graded_at is None
            and self.graded_by_id is None
        ) or (
            self.status == SubmissionStatus.SUBMITTED
            and self.submitted_at is not None
            and self.marks is None
            and self.graded_at is None
            and self.graded_by_id is None
        ) or (
            self.status == SubmissionStatus.GRADED
            and self.submitted_at is not None
            and self.marks is not None
            and self.graded_at is not None
            and self.graded_by_id is not None
        )
        if not state_valid:
            errors["status"] = "Submission timestamps and grade fields do not match its state."
        if self.marks is not None and self.assignment_id and (
            self.marks < 0 or self.marks > self.assignment.max_marks
        ):
            errors["marks"] = "Marks must be between zero and the assignment maximum."
        if self.graded_by_id and self.assignment_id and not _staff_can_manage_batch(
            self.graded_by, self.assignment.batch
        ):
            errors["graded_by"] = "Grader is not allowed to manage this batch."
        if errors:
            raise ValidationError(errors)
