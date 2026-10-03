from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import DjangoUnicodeDecodeError, force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from .models import AuditAction, UserRole
from .policies import TENANT_MANAGER_TARGET_ROLES
from .services import record_security_event, revoke_user_sessions


User = get_user_model()


class InstitutionSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    code = serializers.CharField(read_only=True)


class UserMeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="full_name", read_only=True)
    institution = InstitutionSerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "name", "email", "role", "institution", "is_active")
        read_only_fields = fields


class ManagedUserSerializer(serializers.ModelSerializer):
    institution = InstitutionSerializer(read_only=True)
    institution_id = serializers.UUIDField(write_only=True, required=False)
    batch_id = serializers.UUIDField(write_only=True, required=False)
    subject_id = serializers.UUIDField(write_only=True, required=False)
    student_id = serializers.UUIDField(write_only=True, required=False)
    relationship = serializers.CharField(write_only=True, required=False, max_length=64)
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "full_name",
            "email",
            "role",
            "institution",
            "institution_id",
            "batch_id",
            "subject_id",
            "student_id",
            "relationship",
            "is_active",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "institution", "is_active", "status", "created_at", "updated_at")

    def get_status(self, obj):
        return "active" if obj.is_active else "pending_or_disabled"

    def validate_email(self, value):
        value = User.objects.normalize_email(value).lower()
        existing = User.objects.filter(email__iexact=value)
        if self.instance is not None:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        actor = self.context["request"].user
        relationship_fields = {"batch_id", "subject_id", "student_id", "relationship"}
        if self.instance is not None and relationship_fields.intersection(self.initial_data):
            raise serializers.ValidationError(
                "Academic relationship fields are only accepted during account creation."
            )
        allowed_roles = TENANT_MANAGER_TARGET_ROLES.get(actor.role, set())
        requested_role = attrs.get("role", getattr(self.instance, "role", None))
        if requested_role not in allowed_roles:
            raise serializers.ValidationError(
                {"role": "You are not permitted to create or assign this role."}
            )
        requested_institution = attrs.pop("institution_id", None)
        if requested_institution is not None and requested_institution != actor.institution_id:
            raise serializers.ValidationError(
                {"institution_id": "Users may only be managed inside your institution."}
            )
        if not actor.institution_id:
            raise serializers.ValidationError("Your account is not assigned to an institution.")
        batch_id = attrs.pop("batch_id", None)
        subject_id = attrs.pop("subject_id", None)
        student_id = attrs.pop("student_id", None)
        relationship = (attrs.pop("relationship", "") or "").strip()
        provisioning_data = {}
        if requested_role == UserRole.TEACHER and (student_id or relationship):
            raise serializers.ValidationError("Parent relationship fields cannot provision a teacher.")
        if requested_role == UserRole.STUDENT and (subject_id or student_id or relationship):
            raise serializers.ValidationError("These relationship fields cannot provision a student.")
        if requested_role == UserRole.PARENT and (batch_id or subject_id):
            raise serializers.ValidationError("Batch assignment fields cannot provision a parent.")
        if requested_role == UserRole.TEACHER and (batch_id or subject_id):
            if not batch_id:
                raise serializers.ValidationError({"batch_id": "A batch is required for a subject assignment."})
            from apps.academics.models import Batch, BatchStatus, Subject

            batch = Batch.objects.filter(
                pk=batch_id, institution_id=actor.institution_id, status=BatchStatus.ACTIVE
            ).first()
            if batch is None:
                raise serializers.ValidationError({"batch_id": "Select an active batch in your institution."})
            provisioning_data = {"batch_id": str(batch.pk)}
            if subject_id:
                subject = Subject.objects.filter(
                    pk=subject_id,
                    institution_id=actor.institution_id,
                    course_id=batch.course_id,
                    is_active=True,
                ).first()
                if subject is None:
                    raise serializers.ValidationError({"subject_id": "Select an active subject for this batch."})
                provisioning_data["subject_id"] = str(subject.pk)
        elif requested_role == UserRole.STUDENT and batch_id:
            from apps.academics.models import Batch, BatchStatus

            batch = Batch.objects.filter(
                pk=batch_id, institution_id=actor.institution_id, status=BatchStatus.ACTIVE
            ).first()
            if batch is None:
                raise serializers.ValidationError({"batch_id": "Select an active batch in your institution."})
            provisioning_data = {"batch_id": str(batch.pk)}
        elif requested_role == UserRole.PARENT and (student_id or relationship):
            if not student_id or not relationship:
                raise serializers.ValidationError(
                    {"student_id": "A student and relationship are both required."}
                )
            student = User.objects.filter(
                pk=student_id,
                institution_id=actor.institution_id,
                role=UserRole.STUDENT,
                is_active=True,
            ).first()
            if student is None:
                raise serializers.ValidationError({"student_id": "Select an active student in your institution."})
            provisioning_data = {"student_id": str(student.pk), "relationship": relationship}
        elif batch_id or subject_id or student_id or relationship:
            raise serializers.ValidationError("Academic relationship fields do not match the selected role.")
        attrs["provisioning_data"] = provisioning_data
        return attrs

    def create(self, validated_data):
        actor = self.context["request"].user
        return User.objects.create_user(
            password=None,
            institution_id=actor.institution_id,
            is_active=False,
            **validated_data,
        )

    def update(self, instance, validated_data):
        validated_data.pop("institution_id", None)
        validated_data.pop("provisioning_data", None)
        if "role" in validated_data and validated_data["role"] != instance.role:
            instance.provisioning_data = {}
            instance.save(update_fields=("provisioning_data", "updated_at"))
        return super().update(instance, validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    default_error_messages = {"invalid": "Invalid email or password."}

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]
        user = authenticate(request=self.context.get("request"), email=email, password=password)
        if user is None:
            candidate = User.objects.filter(email__iexact=email).first()
            if candidate and candidate.check_password(password) and not candidate.is_active:
                raise AuthenticationFailed("This account is inactive.")
            raise AuthenticationFailed(self.error_messages["invalid"])
        if not user.is_active:
            raise AuthenticationFailed("This account is inactive.")

        refresh = RefreshToken.for_user(user)
        refresh["auth_version"] = user.auth_version
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserMeSerializer(user).data,
        }


class ActiveUserTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = RefreshToken(attrs["refresh"])
        user = User.objects.filter(pk=refresh["user_id"], is_active=True).first()
        if user is None:
            raise AuthenticationFailed("This account is inactive or no longer exists.")
        if refresh.get("auth_version") != user.auth_version:
            raise AuthenticationFailed("This session is no longer valid.")
        return super().validate(attrs)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True)

    def save(self, **kwargs):
        try:
            RefreshToken(self.validated_data["refresh"]).blacklist()
        except Exception as exc:
            raise serializers.ValidationError({"refresh": "Invalid or expired refresh token."}) from exc


def user_from_uid(uid):
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        return User.objects.get(pk=user_id)
    except (ValueError, TypeError, OverflowError, DjangoUnicodeDecodeError, User.DoesNotExist):
        return None


class PasswordPairSerializer(serializers.Serializer):
    uid = serializers.CharField(write_only=True)
    token = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def eligible(self, user):
        raise NotImplementedError

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "The password confirmation does not match."}
            )
        user = user_from_uid(attrs["uid"])
        if (
            user is None
            or not self.eligible(user)
            or not default_token_generator.check_token(user, attrs["token"])
        ):
            raise serializers.ValidationError({"token": "This password link is invalid or expired."})
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)}) from exc
        attrs["user"] = user
        return attrs


class SetPasswordSerializer(PasswordPairSerializer):
    def eligible(self, user):
        return not user.is_active and not user.has_usable_password()

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.is_active = True
        user.auth_version += 1
        user.save(update_fields=("password", "is_active", "auth_version", "updated_at"))
        from .services import materialize_pending_relationship

        materialize_pending_relationship(user)
        record_security_event(
            action=AuditAction.PASSWORD_SETUP_COMPLETED,
            target_user=user,
            actor=user,
        )
        return user


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(write_only=True)


class ResetPasswordSerializer(PasswordPairSerializer):
    def eligible(self, user):
        return user.is_active and user.has_usable_password()

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=("password", "updated_at"))
        revoke_user_sessions(user)
        record_security_event(
            action=AuditAction.PASSWORD_RESET_COMPLETED,
            target_user=user,
            actor=user,
        )
        return user


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError(
                {"current_password": "The current password is incorrect."}
            )
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "The password confirmation does not match."}
            )
        if user.check_password(attrs["new_password"]):
            raise serializers.ValidationError(
                {"new_password": "The new password must be different from the current password."}
            )
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)}) from exc
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=("password", "updated_at"))
        revoke_user_sessions(user)
        record_security_event(action=AuditAction.PASSWORD_CHANGED, target_user=user, actor=user)
        return user
