import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from apps.accounts.models import Institution, UserRole


class TenantModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.PROTECT, editable=False)

    class Meta:
        abstract = True

    def derived_institution_id(self):
        return self.institution_id

    def save(self, *args, **kwargs):
        derived_id = self.derived_institution_id()
        if derived_id is not None:
            self.institution_id = derived_id
        self.full_clean()
        return super().save(*args, **kwargs)


class Department(TenantModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=64)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("code"), "institution", name="academics_department_tenant_code_ci_unique"
            )
        ]
        indexes = [models.Index(fields=("institution", "is_active"))]

    def clean(self):
        super().clean()
        if not (self.name or "").strip() or not (self.code or "").strip():
            raise ValidationError("Department name and code cannot be blank.")

    def __str__(self):
        return f"{self.code}: {self.name}"


class Course(TenantModel):
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="courses")
    code = models.CharField(max_length=64)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("code"), "institution", name="academics_course_tenant_code_ci_unique"
            )
        ]
        indexes = [models.Index(fields=("department", "is_active"))]

    def derived_institution_id(self):
        return self.department.institution_id if self.department_id else self.institution_id

    def clean(self):
        super().clean()
        if not (self.code or "").strip() or not (self.title or "").strip():
            raise ValidationError("Course code and title cannot be blank.")
        if self.department_id and self.institution_id != self.department.institution_id:
            raise ValidationError({"department": "Course and department must share an institution."})

    def __str__(self):
        return f"{self.code}: {self.title}"


class Subject(TenantModel):
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="subjects")
    code = models.CharField(max_length=64)
    title = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("code"), "course", name="academics_subject_course_code_ci_unique"
            )
        ]
        indexes = [models.Index(fields=("institution", "is_active"))]

    def derived_institution_id(self):
        return self.course.institution_id if self.course_id else self.institution_id

    def clean(self):
        super().clean()
        if not (self.code or "").strip() or not (self.title or "").strip():
            raise ValidationError("Subject code and title cannot be blank.")
        if self.course_id and self.institution_id != self.course.institution_id:
            raise ValidationError({"course": "Subject and course must share an institution."})

    def __str__(self):
        return f"{self.code}: {self.title}"


class BatchStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"


class Batch(TenantModel):
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="batches")
    name = models.CharField(max_length=255)
    schedule = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=BatchStatus.choices, default=BatchStatus.ACTIVE)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "institution",
                condition=models.Q(status=BatchStatus.ACTIVE),
                name="academics_active_batch_tenant_name_ci_unique",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(status=BatchStatus.ACTIVE, archived_at__isnull=True)
                    | models.Q(status=BatchStatus.ARCHIVED, archived_at__isnull=False)
                ),
                name="academics_batch_archive_state_consistent",
            ),
        ]
        indexes = [models.Index(fields=("course", "status"))]

    def derived_institution_id(self):
        return self.course.institution_id if self.course_id else self.institution_id

    def clean(self):
        super().clean()
        if not (self.name or "").strip():
            raise ValidationError({"name": "Batch name cannot be blank."})
        if self.course_id and self.institution_id != self.course.institution_id:
            raise ValidationError({"course": "Batch and course must share an institution."})
        if (self.status == BatchStatus.ARCHIVED) != (self.archived_at is not None):
            raise ValidationError({"status": "Archived batches require archived_at; active batches forbid it."})

    def archive(self):
        self.status = BatchStatus.ARCHIVED
        self.archived_at = timezone.now()
        self.save()

    def __str__(self):
        return self.name


class TeacherAssignment(TenantModel):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name="teacher_assignments")
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="teaching_assignments"
    )
    subject = models.ForeignKey(
        Subject, null=True, blank=True, on_delete=models.PROTECT, related_name="teacher_assignments"
    )
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("batch", "teacher", "subject"),
                condition=models.Q(subject__isnull=False),
                name="academics_teacher_batch_subject_unique",
            ),
            models.UniqueConstraint(
                fields=("batch", "teacher"),
                condition=models.Q(subject__isnull=True),
                name="academics_teacher_batch_general_unique",
            ),
        ]
        indexes = [models.Index(fields=("teacher", "is_active"))]

    def derived_institution_id(self):
        return self.batch.institution_id if self.batch_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        if self.teacher_id:
            if self.teacher.role != UserRole.TEACHER:
                errors["teacher"] = "Teacher assignments require a user with the teacher role."
            elif self.teacher.institution_id != self.institution_id:
                errors["teacher"] = "Teacher and batch must share an institution."
            elif self.is_active and not self.teacher.is_active:
                errors["teacher"] = "An active assignment requires an active teacher."
        if self.batch_id and self.is_active and self.batch.status != BatchStatus.ACTIVE:
            errors["batch"] = "An active assignment requires an active batch."
        if self.subject_id:
            if self.subject.institution_id != self.institution_id:
                errors["subject"] = "Subject and batch must share an institution."
            elif self.subject.course_id != self.batch.course_id:
                errors["subject"] = "Subject must belong to the batch course."
            elif not self.subject.is_active:
                errors["subject"] = "Assigned subject must be active."
        if errors:
            raise ValidationError(errors)


class EnrollmentStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    REMOVED = "removed", "Removed"


class StudentEnrollment(TenantModel):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name="student_enrollments")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="student_enrollments"
    )
    status = models.CharField(max_length=16, choices=EnrollmentStatus.choices, default=EnrollmentStatus.ACTIVE)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    removed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("batch", "student"), name="academics_batch_student_unique"),
            models.CheckConstraint(
                condition=(
                    models.Q(status=EnrollmentStatus.ACTIVE, removed_at__isnull=True)
                    | models.Q(status=EnrollmentStatus.REMOVED, removed_at__isnull=False)
                ),
                name="academics_enrollment_removal_state_consistent",
            ),
        ]
        indexes = [models.Index(fields=("student", "status"))]

    def derived_institution_id(self):
        return self.batch.institution_id if self.batch_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        if self.student_id:
            if self.student.role != UserRole.STUDENT:
                errors["student"] = "Student enrollment requires a user with the student role."
            elif self.student.institution_id != self.institution_id:
                errors["student"] = "Student and batch must share an institution."
            elif self.status == EnrollmentStatus.ACTIVE and not self.student.is_active:
                errors["student"] = "An active enrollment requires an active student."
        if self.batch_id and self.status == EnrollmentStatus.ACTIVE and self.batch.status != BatchStatus.ACTIVE:
            errors["batch"] = "An active enrollment requires an active batch."
        if (self.status == EnrollmentStatus.REMOVED) != (self.removed_at is not None):
            errors["status"] = "Removed enrollments require removed_at; active enrollments forbid it."
        if errors:
            raise ValidationError(errors)

    def remove(self):
        self.status = EnrollmentStatus.REMOVED
        self.removed_at = timezone.now()
        self.save()


class ParentStudentLink(TenantModel):
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="parent_student_links"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="linked_parent_records"
    )
    relationship = models.CharField(max_length=64)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("parent", "student"), name="academics_parent_student_unique")
        ]
        indexes = [
            models.Index(fields=("parent",)),
            models.Index(fields=("student",)),
            models.Index(fields=("institution",)),
        ]

    def derived_institution_id(self):
        return self.parent.institution_id if self.parent_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        if not (self.relationship or "").strip():
            errors["relationship"] = "Relationship cannot be blank."
        if self.parent_id:
            if self.parent.role != UserRole.PARENT:
                errors["parent"] = "Parent links require a user with the parent role."
            elif self.parent.institution_id != self.institution_id:
                errors["parent"] = "Parent and link must share an institution."
        if self.student_id:
            if self.student.role != UserRole.STUDENT:
                errors["student"] = "Linked child must have the student role."
            elif self.student.institution_id != self.institution_id:
                errors["student"] = "Parent and student must share an institution."
        if errors:
            raise ValidationError(errors)
