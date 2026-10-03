from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User, UserRole
from apps.academics.models import Batch, EnrollmentStatus, StudentEnrollment, Subject

from .models import (
    Assignment,
    AssignmentStatus,
    AttendanceRecord,
    AttendanceSession,
    AttendanceSessionStatus,
    Submission,
    SubmissionStatus,
)
from .services import can_manage_batch


class RejectProtectedFieldsMixin:
    protected_fields = frozenset()

    def to_internal_value(self, data):
        supplied = sorted(set(data.keys()) & set(self.protected_fields))
        if supplied:
            raise serializers.ValidationError(
                {field: "This field is controlled by the server." for field in supplied}
            )
        return super().to_internal_value(data)


class AttendanceSessionSerializer(RejectProtectedFieldsMixin, serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    created_by = serializers.UUIDField(source="created_by_id", read_only=True)
    protected_fields = {"institution", "institution_id", "created_by", "created_by_id"}

    class Meta:
        model = AttendanceSession
        fields = (
            "id", "institution", "batch", "subject", "attendance_date", "status", "notes",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "institution", "created_by", "created_at", "updated_at")

    def validate(self, attrs):
        instance = self.instance
        actor = self.context["request"].user
        batch = attrs.get("batch", getattr(instance, "batch", None))
        subject = attrs.get("subject", getattr(instance, "subject", None))
        errors = {}
        if instance and any(
            field in attrs and attrs[field] != getattr(instance, field)
            for field in ("batch", "subject", "attendance_date")
        ):
            errors["non_field_errors"] = "Session identity fields cannot be changed."
        if batch and not can_manage_batch(actor, batch):
            errors["batch"] = "You are not allowed to manage this batch."
        if batch and subject and (
            subject.institution_id != batch.institution_id
            or subject.course_id != batch.course_id
            or not subject.is_active
        ):
            errors["subject"] = "Subject must be active and belong to the batch course."
        if batch and subject:
            duplicate = AttendanceSession.objects.filter(
                batch=batch,
                subject=subject,
                attendance_date=attrs.get(
                    "attendance_date", getattr(instance, "attendance_date", None)
                ),
            )
            if instance:
                duplicate = duplicate.exclude(pk=instance.pk)
            if duplicate.exists():
                errors["non_field_errors"] = "This attendance session already exists."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        return AttendanceSession.objects.create(
            created_by=self.context["request"].user, **validated_data
        )


class AttendanceRecordSerializer(RejectProtectedFieldsMixin, serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    marked_by = serializers.UUIDField(source="marked_by_id", read_only=True)
    student = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    protected_fields = {
        "institution", "institution_id", "marked_by", "marked_by_id", "marked_at",
    }

    class Meta:
        model = AttendanceRecord
        fields = (
            "id", "institution", "session", "student", "status", "marked_by", "marked_at", "updated_at",
        )
        read_only_fields = ("id", "institution", "marked_by", "marked_at", "updated_at")

    def validate(self, attrs):
        instance = self.instance
        actor = self.context["request"].user
        session = attrs.get("session", getattr(instance, "session", None))
        student = attrs.get("student", getattr(instance, "student", None))
        errors = {}
        if instance and any(
            field in attrs and attrs[field] != getattr(instance, field)
            for field in ("session", "student")
        ):
            errors["non_field_errors"] = "Attendance ownership fields cannot be changed."
        if session and not can_manage_batch(actor, session.batch):
            errors["session"] = "You are not allowed to manage this batch."
        elif session and session.status != AttendanceSessionStatus.OPEN:
            errors["session"] = "Attendance can only be marked in an open session."
        if student and (
            student.role != UserRole.STUDENT
            or not student.is_active
            or not session
            or student.institution_id != session.institution_id
            or not StudentEnrollment.objects.filter(
                batch=session.batch, student=student, status=EnrollmentStatus.ACTIVE
            ).exists()
        ):
            errors["student"] = "Student must be active and enrolled in the session batch."
        if session and student:
            duplicate = AttendanceRecord.objects.filter(session=session, student=student)
            if instance:
                duplicate = duplicate.exclude(pk=instance.pk)
            if duplicate.exists():
                errors["non_field_errors"] = "Attendance is already marked for this student."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        return AttendanceRecord.objects.create(
            marked_by=self.context["request"].user, **validated_data
        )

    def update(self, instance, validated_data):
        instance.marked_by = self.context["request"].user
        instance.marked_at = timezone.now()
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class AssignmentSerializer(RejectProtectedFieldsMixin, serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    created_by = serializers.UUIDField(source="created_by_id", read_only=True)
    protected_fields = {"institution", "institution_id", "created_by", "created_by_id"}

    class Meta:
        model = Assignment
        fields = (
            "id", "institution", "batch", "subject", "title", "instructions", "due_at",
            "max_marks", "status", "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "institution", "created_by", "created_at", "updated_at")

    def validate(self, attrs):
        instance = self.instance
        actor = self.context["request"].user
        batch = attrs.get("batch", getattr(instance, "batch", None))
        subject = attrs.get("subject", getattr(instance, "subject", None))
        errors = {}
        if instance and any(
            field in attrs and attrs[field] != getattr(instance, field)
            for field in ("batch", "subject")
        ):
            errors["non_field_errors"] = "Assignment ownership fields cannot be changed."
        if batch and not can_manage_batch(actor, batch):
            errors["batch"] = "You are not allowed to manage this batch."
        if batch and subject and (
            subject.institution_id != batch.institution_id
            or subject.course_id != batch.course_id
            or not subject.is_active
        ):
            errors["subject"] = "Subject must be active and belong to the batch course."
        if attrs.get("max_marks", getattr(instance, "max_marks", None)) is not None and attrs.get(
            "max_marks", getattr(instance, "max_marks", None)
        ) <= 0:
            errors["max_marks"] = "Maximum marks must be greater than zero."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        return Assignment.objects.create(created_by=self.context["request"].user, **validated_data)


class SubmissionSerializer(RejectProtectedFieldsMixin, serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    student = serializers.UUIDField(source="student_id", read_only=True)
    graded_by = serializers.UUIDField(source="graded_by_id", read_only=True, allow_null=True)
    protected_fields = {
        "institution", "institution_id", "student", "student_id", "submitted_at", "marks",
        "feedback", "graded_by", "graded_by_id", "graded_at",
    }

    class Meta:
        model = Submission
        fields = (
            "id", "institution", "assignment", "student", "response", "status", "submitted_at",
            "marks", "feedback", "graded_by", "graded_at", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "institution", "student", "submitted_at", "marks", "feedback", "graded_by",
            "graded_at", "created_at", "updated_at",
        )

    def validate(self, attrs):
        actor = self.context["request"].user
        instance = self.instance
        assignment = attrs.get("assignment", getattr(instance, "assignment", None))
        requested_status = attrs.get("status", getattr(instance, "status", SubmissionStatus.DRAFT))
        errors = {}
        if actor.role != UserRole.STUDENT:
            errors["non_field_errors"] = "Only students may create or edit submissions."
        if instance and "assignment" in attrs and assignment != instance.assignment:
            errors["assignment"] = "A submission cannot be moved to another assignment."
        if instance and instance.status == SubmissionStatus.GRADED:
            errors["non_field_errors"] = "A graded submission cannot be edited by a student."
        if requested_status not in {SubmissionStatus.DRAFT, SubmissionStatus.SUBMITTED}:
            errors["status"] = "Students may only save drafts or submit work."
        if assignment:
            if assignment.status != AssignmentStatus.PUBLISHED:
                errors["assignment"] = "The assignment is not published."
            elif timezone.now() > assignment.due_at:
                errors["assignment"] = "The submission deadline has passed."
            elif not StudentEnrollment.objects.filter(
                batch=assignment.batch, student=actor, status=EnrollmentStatus.ACTIVE
            ).exists():
                errors["assignment"] = "You are not actively enrolled in this batch."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        actor = self.context["request"].user
        if Submission.objects.filter(
            assignment=validated_data["assignment"], student=actor
        ).exists():
            raise serializers.ValidationError(
                {"assignment": "You already have a submission for this assignment."}
            )
        if validated_data.get("status") == SubmissionStatus.SUBMITTED:
            validated_data["submitted_at"] = timezone.now()
        return Submission.objects.create(student=actor, **validated_data)

    def update(self, instance, validated_data):
        if validated_data.get("status") == SubmissionStatus.SUBMITTED and not instance.submitted_at:
            validated_data["submitted_at"] = timezone.now()
        elif validated_data.get("status") == SubmissionStatus.DRAFT:
            validated_data["submitted_at"] = None
        return super().update(instance, validated_data)


class GradeSubmissionSerializer(RejectProtectedFieldsMixin, serializers.Serializer):
    marks = serializers.DecimalField(max_digits=8, decimal_places=2)
    feedback = serializers.CharField(required=False, allow_blank=True)
    protected_fields = {
        "institution", "assignment", "student", "response", "status", "submitted_at",
        "graded_by", "graded_by_id", "graded_at",
    }

    def validate_marks(self, value):
        if value < 0 or value > self.instance.assignment.max_marks:
            raise serializers.ValidationError("Marks must be between zero and the assignment maximum.")
        return value

    def validate(self, attrs):
        actor = self.context["request"].user
        if not can_manage_batch(actor, self.instance.assignment.batch):
            raise serializers.ValidationError("You are not allowed to grade this submission.")
        if self.instance.status not in {SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED}:
            raise serializers.ValidationError("Only submitted work can be graded.")
        return attrs

    def update(self, instance, validated_data):
        instance.status = SubmissionStatus.GRADED
        instance.marks = validated_data["marks"]
        instance.feedback = validated_data.get("feedback", "")
        instance.graded_by = self.context["request"].user
        instance.graded_at = timezone.now()
        instance.save()
        return instance

    def create(self, validated_data):
        raise NotImplementedError
