from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.accounts.models import UserRole
from apps.academics.models import TenantModel


class GoalStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"
    ARCHIVED = "archived", "Archived"


class TaskStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"


class ActivityEventType(models.TextChoices):
    GOAL_CREATED = "goal_created", "Goal created"
    GOAL_COMPLETED = "goal_completed", "Goal completed"
    TASK_CREATED = "task_created", "Task created"
    TASK_COMPLETED = "task_completed", "Task completed"


def _validate_student(student, institution_id):
    return (
        student.role == UserRole.STUDENT
        and student.is_active
        and student.institution_id == institution_id
    )


class DailyGoal(TenantModel):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_goals"
    )
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=255)
    target = models.TextField(blank=True)
    target_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=GoalStatus.choices, default=GoalStatus.ACTIVE)
    completed_at = models.DateTimeField(null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(status=GoalStatus.COMPLETED, completed_at__isnull=False)
                    | models.Q(status__in=(GoalStatus.ACTIVE, GoalStatus.ARCHIVED), completed_at__isnull=True)
                ),
                name="tracker_goal_completion_consistent",
            )
        ]
        indexes = [models.Index(fields=("student", "status"))]

    def derived_institution_id(self):
        return self.student.institution_id if self.student_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        if self.student_id and not _validate_student(self.student, self.institution_id):
            errors["student"] = "Goal owner must be an active Student in the same institution."
        if not (self.title or "").strip():
            errors["title"] = "Title cannot be blank."
        if not (self.category or "").strip():
            errors["category"] = "Category cannot be blank."
        if self.status == GoalStatus.COMPLETED and self.completed_at is None:
            self.completed_at = timezone.now()
        elif self.status != GoalStatus.COMPLETED:
            self.completed_at = None
        if errors:
            raise ValidationError(errors)


class DailyTask(TenantModel):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_tasks"
    )
    goal = models.ForeignKey(
        DailyGoal, null=True, blank=True, on_delete=models.CASCADE, related_name="tasks"
    )
    activity_date = models.DateField(default=timezone.localdate)
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=16, choices=TaskStatus.choices, default=TaskStatus.PENDING)
    completed_at = models.DateTimeField(null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(status=TaskStatus.COMPLETED, completed_at__isnull=False)
                    | models.Q(status=TaskStatus.PENDING, completed_at__isnull=True)
                ),
                name="tracker_task_completion_consistent",
            )
        ]
        indexes = [models.Index(fields=("student", "-activity_date"))]

    def derived_institution_id(self):
        return self.student.institution_id if self.student_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        if self.student_id and not _validate_student(self.student, self.institution_id):
            errors["student"] = "Task owner must be an active Student in the same institution."
        if self.goal_id and (
            self.goal.student_id != self.student_id or self.goal.institution_id != self.institution_id
        ):
            errors["goal"] = "Task goal must belong to the same Student."
        if not (self.title or "").strip():
            errors["title"] = "Title cannot be blank."
        if self.status == TaskStatus.COMPLETED and self.completed_at is None:
            self.completed_at = timezone.now()
        elif self.status != TaskStatus.COMPLETED:
            self.completed_at = None
        if errors:
            raise ValidationError(errors)


class ActivityEvent(TenantModel):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_activity_events"
    )
    event_type = models.CharField(max_length=32, choices=ActivityEventType.choices)
    goal = models.ForeignKey(
        DailyGoal, null=True, blank=True, on_delete=models.CASCADE, related_name="activity_events"
    )
    task = models.ForeignKey(
        DailyTask, null=True, blank=True, on_delete=models.CASCADE, related_name="activity_events"
    )
    occurred_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        indexes = [models.Index(fields=("student", "-occurred_at"))]

    def derived_institution_id(self):
        return self.student.institution_id if self.student_id else self.institution_id

    def clean(self):
        super().clean()
        errors = {}
        if self.student_id and not _validate_student(self.student, self.institution_id):
            errors["student"] = "Activity owner must be an active Student in the same institution."
        if self.goal_id and self.goal.student_id != self.student_id:
            errors["goal"] = "Activity goal must belong to the same Student."
        if self.task_id and self.task.student_id != self.student_id:
            errors["task"] = "Activity task must belong to the same Student."
        if errors:
            raise ValidationError(errors)
