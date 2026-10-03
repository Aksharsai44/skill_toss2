import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from .models import AuditAction, SecurityAuditEvent


logger = logging.getLogger(__name__)


def record_security_event(*, action, target_user=None, actor=None, metadata=None):
    return SecurityAuditEvent.objects.create(
        action=action,
        target_user=target_user,
        actor=actor,
        metadata=metadata or {},
    )


def password_link(user, route):
    query = urlencode(
        {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
        }
    )
    return f"{settings.FRONTEND_BASE_URL}/{route}?{query}"


def send_invite_email(user, actor=None):
    link = password_link(user, "set-password")
    send_mail(
        "Set up your SkillToss account",
        (
            f"Hello {user.full_name},\n\n"
            "An account has been created for you on SkillToss. "
            "Choose your password using this one-time link:\n\n"
            f"{link}\n\nIf you were not expecting this invitation, contact your administrator."
        ),
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
    record_security_event(action=AuditAction.INVITE_SENT, target_user=user, actor=actor)


def send_reset_email(user):
    link = password_link(user, "reset-password")
    send_mail(
        "Reset your SkillToss password",
        (
            f"Hello {user.full_name},\n\n"
            "Use this one-time link to reset your SkillToss password:\n\n"
            f"{link}\n\nIf you did not request this, you can ignore this email."
        ),
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def revoke_user_sessions(user):
    """Invalidate access tokens by version and blacklist known refresh tokens."""
    user.auth_version += 1
    user.save(update_fields=("auth_version", "updated_at"))
    for outstanding in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=outstanding)


def materialize_pending_relationship(user):
    data = user.provisioning_data or {}
    if not data:
        return
    from apps.academics.models import ParentStudentLink, StudentEnrollment, TeacherAssignment
    from .models import UserRole

    if user.role == UserRole.TEACHER:
        TeacherAssignment.objects.create(
            batch_id=data["batch_id"],
            teacher=user,
            subject_id=data.get("subject_id"),
            is_primary=True,
            is_active=True,
        )
    elif user.role == UserRole.STUDENT:
        StudentEnrollment.objects.create(batch_id=data["batch_id"], student=user)
    elif user.role == UserRole.PARENT:
        ParentStudentLink.objects.create(
            parent=user,
            student_id=data["student_id"],
            relationship=data["relationship"],
        )
    user.provisioning_data = {}
    user.save(update_fields=("provisioning_data", "updated_at"))


def request_password_reset(user):
    record_security_event(action=AuditAction.PASSWORD_RESET_REQUESTED, target_user=user)

    def deliver_safely():
        try:
            send_reset_email(user)
        except Exception:
            # The public endpoint must not disclose account existence through provider failures.
            logger.exception("Password reset email delivery failed.")

    transaction.on_commit(deliver_safely)
