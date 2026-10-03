import uuid

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Lower


class Institution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=64)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("code"), name="accounts_institution_code_ci_unique")
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class UserRole(models.TextChoices):
    SUPER_ADMIN = "super_admin", "Super Admin"
    PRODUCT_ADMIN = "product_admin", "Product Admin"
    ADMIN = "admin", "Admin"
    TEACHER = "teacher", "Teacher"
    STUDENT = "student", "Student"
    PARENT = "parent", "Parent"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.full_clean(exclude={"password"})
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", UserRole.PRODUCT_ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True or extra_fields.get("is_superuser") is not True:
            raise ValueError("A Django superuser must have is_staff=True and is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=32, choices=UserRole.choices)
    institution = models.ForeignKey(
        Institution,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="users",
    )
    avatar_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    auth_version = models.PositiveBigIntegerField(default=0, editable=False)
    provisioning_data = models.JSONField(default=dict, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("email"), name="accounts_user_email_ci_unique"),
            models.CheckConstraint(
                condition=models.Q(role=UserRole.PRODUCT_ADMIN, institution__isnull=True)
                | ~models.Q(role=UserRole.PRODUCT_ADMIN),
                name="accounts_product_admin_has_no_tenant",
            ),
            models.CheckConstraint(
                condition=models.Q(is_active=False)
                | models.Q(role=UserRole.PRODUCT_ADMIN)
                | models.Q(institution__isnull=False),
                name="accounts_active_user_has_tenant",
            ),
        ]

    def clean(self):
        super().clean()
        self.email = self.__class__.objects.normalize_email(self.email).lower()
        if self.role == UserRole.PRODUCT_ADMIN and self.institution_id is not None:
            raise ValidationError({"institution": "Product Admin must not belong to an institution."})
        if self.is_active and self.role != UserRole.PRODUCT_ADMIN and self.institution_id is None:
            raise ValidationError({"institution": "An active tenant role requires an institution."})

    def __str__(self):
        return self.email


class AuditAction(models.TextChoices):
    USER_CREATED = "user_created", "User created"
    INVITE_SENT = "invite_sent", "Invite sent"
    PASSWORD_SETUP_COMPLETED = "password_setup_completed", "Password setup completed"
    PASSWORD_RESET_REQUESTED = "password_reset_requested", "Password reset requested"
    PASSWORD_RESET_COMPLETED = "password_reset_completed", "Password reset completed"
    PASSWORD_CHANGED = "password_changed", "Password changed"
    ACCOUNT_DISABLED = "account_disabled", "Account disabled"
    ACCOUNT_REACTIVATED = "account_reactivated", "Account reactivated"
    ROLE_CHANGED = "role_changed", "Role changed"


class SecurityAuditEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="security_actions",
    )
    target_user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="security_audit_events",
    )
    action = models.CharField(max_length=64, choices=AuditAction.choices)
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-timestamp",)
        indexes = [
            models.Index(fields=("target_user", "timestamp")),
            models.Index(fields=("action", "timestamp")),
        ]

    def __str__(self):
        return f"{self.action} at {self.timestamp.isoformat()}"
