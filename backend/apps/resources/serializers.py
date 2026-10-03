from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import UserRole
from apps.academics.models import EnrollmentStatus, StudentEnrollment
from apps.learning.models import AssignmentStatus, SubmissionStatus
from apps.learning.services import can_manage_batch

from .models import (
    AssignmentResource, LearningResource, NoteFile, StudentNote, SubmissionAttachment,
)
from .validators import MAX_FILES_PER_OWNER, validate_private_upload


class RejectProtectedFieldsMixin:
    protected_fields = frozenset()

    def to_internal_value(self, data):
        supplied = sorted(set(data.keys()) & set(self.protected_fields))
        if supplied:
            raise serializers.ValidationError(
                {field: "This field is controlled by the server." for field in supplied}
            )
        return super().to_internal_value(data)


class DownloadMetadataMixin:
    def get_download_url(self, obj):
        request = self.context.get("request")
        url = reverse(self.download_route_name, args=(obj.pk,))
        return request.build_absolute_uri(url) if request else url


class StudentNoteSerializer(RejectProtectedFieldsMixin, serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    student = serializers.UUIDField(source="student_id", read_only=True)
    protected_fields = {"institution", "institution_id", "student", "student_id"}

    class Meta:
        model = StudentNote
        fields = ("id", "institution", "student", "title", "content", "created_at", "updated_at")
        read_only_fields = ("id", "institution", "student", "created_at", "updated_at")

    def create(self, validated_data):
        return StudentNote.objects.create(student=self.context["request"].user, **validated_data)


class NoteFileSerializer(
    DownloadMetadataMixin, RejectProtectedFieldsMixin, serializers.ModelSerializer
):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    student = serializers.UUIDField(source="student_id", read_only=True)
    file = serializers.FileField(write_only=True)
    download_url = serializers.SerializerMethodField()
    download_route_name = "note-file-download"
    protected_fields = {
        "institution", "institution_id", "student", "student_id", "file_name", "mime_type",
        "file_size", "storage_path", "created_at",
    }

    class Meta:
        model = NoteFile
        fields = (
            "id", "institution", "note", "student", "file", "file_name", "mime_type",
            "file_size", "created_at", "download_url",
        )
        read_only_fields = (
            "id", "institution", "student", "file_name", "mime_type", "file_size", "created_at",
            "download_url",
        )

    def validate(self, attrs):
        actor = self.context["request"].user
        note = attrs.get("note")
        if actor.role != UserRole.STUDENT or not note or note.student_id != actor.id:
            raise serializers.ValidationError({"note": "Note must belong to the authenticated Student."})
        if note.files.count() >= MAX_FILES_PER_OWNER:
            raise serializers.ValidationError({"file": "A note may contain at most five files."})
        try:
            attrs["validated_file_metadata"] = validate_private_upload(attrs["file"])
        except Exception as exc:
            if isinstance(exc, serializers.ValidationError):
                raise
            raise serializers.ValidationError({"file": getattr(exc, "messages", [str(exc)])}) from exc
        return attrs

    def create(self, validated_data):
        safe_name, mime_type = validated_data.pop("validated_file_metadata")
        upload = validated_data["file"]
        return NoteFile.objects.create(
            student=self.context["request"].user,
            file_name=safe_name,
            mime_type=mime_type,
            file_size=upload.size,
            **validated_data,
        )


class LearningResourceSerializer(
    DownloadMetadataMixin, RejectProtectedFieldsMixin, serializers.ModelSerializer
):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    uploaded_by = serializers.UUIDField(source="uploaded_by_id", read_only=True)
    file = serializers.FileField(write_only=True)
    download_url = serializers.SerializerMethodField()
    download_route_name = "learning-resource-download"
    protected_fields = {
        "institution", "institution_id", "uploaded_by", "uploaded_by_id", "file_name",
        "mime_type", "file_size", "storage_path", "created_at",
    }

    class Meta:
        model = LearningResource
        fields = (
            "id", "institution", "batch", "subject", "title", "description", "file",
            "file_name", "mime_type", "file_size", "uploaded_by", "created_at", "download_url",
        )
        read_only_fields = (
            "id", "institution", "file_name", "mime_type", "file_size", "uploaded_by",
            "created_at", "download_url",
        )

    def validate(self, attrs):
        actor = self.context["request"].user
        batch = attrs.get("batch")
        subject = attrs.get("subject")
        errors = {}
        if not batch or not can_manage_batch(actor, batch):
            errors["batch"] = "You are not allowed to manage this batch."
        if batch and subject and (
            subject.institution_id != batch.institution_id
            or subject.course_id != batch.course_id
            or not subject.is_active
        ):
            errors["subject"] = "Subject must be active and belong to the batch course."
        if errors:
            raise serializers.ValidationError(errors)
        try:
            attrs["validated_file_metadata"] = validate_private_upload(attrs["file"])
        except Exception as exc:
            raise serializers.ValidationError({"file": getattr(exc, "messages", [str(exc)])}) from exc
        return attrs

    def create(self, validated_data):
        safe_name, mime_type = validated_data.pop("validated_file_metadata")
        upload = validated_data["file"]
        return LearningResource.objects.create(
            uploaded_by=self.context["request"].user,
            file_name=safe_name,
            mime_type=mime_type,
            file_size=upload.size,
            **validated_data,
        )


class SubmissionAttachmentSerializer(
    DownloadMetadataMixin, RejectProtectedFieldsMixin, serializers.ModelSerializer
):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    uploaded_by = serializers.UUIDField(source="uploaded_by_id", read_only=True)
    file = serializers.FileField(write_only=True)
    download_url = serializers.SerializerMethodField()
    download_route_name = "submission-file-download"
    protected_fields = {
        "institution", "institution_id", "uploaded_by", "uploaded_by_id", "file_name",
        "mime_type", "file_size", "storage_path", "created_at",
    }

    class Meta:
        model = SubmissionAttachment
        fields = (
            "id", "institution", "submission", "file", "file_name", "mime_type", "file_size",
            "uploaded_by", "created_at", "download_url",
        )
        read_only_fields = (
            "id", "institution", "file_name", "mime_type", "file_size", "uploaded_by",
            "created_at", "download_url",
        )

    def validate(self, attrs):
        actor = self.context["request"].user
        submission = attrs.get("submission")
        errors = {}
        if actor.role != UserRole.STUDENT or not submission or submission.student_id != actor.id:
            errors["submission"] = "Submission must belong to the authenticated Student."
        elif submission.status == SubmissionStatus.GRADED:
            errors["submission"] = "A graded submission cannot receive files."
        elif submission.assignment.status != AssignmentStatus.PUBLISHED:
            errors["submission"] = "Submission files require a published assignment."
        elif timezone.now() > submission.assignment.due_at:
            errors["submission"] = "The submission deadline has passed."
        elif not StudentEnrollment.objects.filter(
            batch=submission.assignment.batch,
            student=actor,
            status=EnrollmentStatus.ACTIVE,
        ).exists():
            errors["submission"] = "You are not actively enrolled in this batch."
        elif submission.files.count() >= MAX_FILES_PER_OWNER:
            errors["file"] = "A submission may contain at most five files."
        if errors:
            raise serializers.ValidationError(errors)
        try:
            attrs["validated_file_metadata"] = validate_private_upload(attrs["file"])
        except Exception as exc:
            raise serializers.ValidationError({"file": getattr(exc, "messages", [str(exc)])}) from exc
        return attrs

    def create(self, validated_data):
        safe_name, mime_type = validated_data.pop("validated_file_metadata")
        upload = validated_data["file"]
        return SubmissionAttachment.objects.create(
            uploaded_by=self.context["request"].user,
            file_name=safe_name,
            mime_type=mime_type,
            file_size=upload.size,
            **validated_data,
        )


class AssignmentResourceSerializer(
    DownloadMetadataMixin, RejectProtectedFieldsMixin, serializers.ModelSerializer
):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    uploaded_by = serializers.UUIDField(source="uploaded_by_id", read_only=True)
    file = serializers.FileField(write_only=True)
    download_url = serializers.SerializerMethodField()
    download_route_name = "assignment-resource-download"
    protected_fields = {
        "institution", "institution_id", "uploaded_by", "uploaded_by_id", "file_name",
        "mime_type", "file_size", "storage_path", "created_at",
    }

    class Meta:
        model = AssignmentResource
        fields = (
            "id", "institution", "assignment", "file", "file_name", "mime_type", "file_size",
            "uploaded_by", "created_at", "download_url",
        )
        read_only_fields = (
            "id", "institution", "file_name", "mime_type", "file_size", "uploaded_by",
            "created_at", "download_url",
        )

    def validate(self, attrs):
        assignment = attrs.get("assignment")
        actor = self.context["request"].user
        if not assignment or not can_manage_batch(actor, assignment.batch):
            raise serializers.ValidationError(
                {"assignment": "You are not allowed to manage this assignment."}
            )
        if assignment.files.count() >= MAX_FILES_PER_OWNER:
            raise serializers.ValidationError(
                {"file": "An assignment may contain at most five files."}
            )
        try:
            attrs["validated_file_metadata"] = validate_private_upload(attrs["file"])
        except Exception as exc:
            raise serializers.ValidationError({"file": getattr(exc, "messages", [str(exc)])}) from exc
        return attrs

    def create(self, validated_data):
        safe_name, mime_type = validated_data.pop("validated_file_metadata")
        upload = validated_data["file"]
        return AssignmentResource.objects.create(
            uploaded_by=self.context["request"].user,
            file_name=safe_name,
            mime_type=mime_type,
            file_size=upload.size,
            **validated_data,
        )
