from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from .models import AuditAction, User
from .permissions import IsActiveUser, IsTenantManager
from .policies import TENANT_MANAGER_TARGET_ROLES
from .serializers import (
    ActiveUserTokenRefreshSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    ManagedUserSerializer,
    ResetPasswordSerializer,
    SetPasswordSerializer,
    UserMeSerializer,
)
from .services import (
    record_security_event,
    request_password_reset,
    revoke_user_sessions,
    send_invite_email,
)


class LoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class ActiveUserTokenRefreshView(TokenRefreshView):
    serializer_class = ActiveUserTokenRefreshSerializer


class LogoutView(APIView):
    permission_classes = (IsActiveUser,)

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = (IsActiveUser,)

    def get(self, request):
        return Response(UserMeSerializer(request.user).data)


class SetPasswordView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response({"detail": "Password set. You may now sign in."})


class ForgotPasswordView(APIView):
    permission_classes = (AllowAny,)
    message = "If an account exists for that email, a reset link has been sent."

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"], is_active=True
        ).first()
        if user is not None and user.has_usable_password():
            with transaction.atomic():
                request_password_reset(user)
        return Response({"detail": self.message})


class ResetPasswordView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response({"detail": "Password reset. Sign in again on every device."})


class ChangePasswordView(APIView):
    permission_classes = (IsActiveUser,)

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response({"detail": "Password changed. Sign in again on every device."})


class ManagedUserViewSet(viewsets.ModelViewSet):
    serializer_class = ManagedUserSerializer
    permission_classes = (IsTenantManager,)
    http_method_names = ("get", "post", "patch", "head", "options")

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not user.is_active or not getattr(user, "institution_id", None):
            return User.objects.none()
        target_roles = TENANT_MANAGER_TARGET_ROLES.get(user.role, set())
        return (
            User.objects.filter(institution_id=user.institution_id, role__in=target_roles)
            .select_related("institution")
            .order_by("full_name", "email")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        actor = request.user
        with transaction.atomic():
            user = serializer.save()
            record_security_event(
                action=AuditAction.USER_CREATED,
                target_user=user,
                actor=actor,
                metadata={"role": user.role, "institution_id": str(user.institution_id)},
            )
            transaction.on_commit(lambda: send_invite_email(user, actor))
        data = self.get_serializer(user).data
        data["invitation_sent"] = True
        return Response(data, status=status.HTTP_201_CREATED, headers=self.get_success_headers(data))

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_role = instance.role
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            user = serializer.save()
            if user.role != old_role:
                revoke_user_sessions(user)
                record_security_event(
                    action=AuditAction.ROLE_CHANGED,
                    target_user=user,
                    actor=request.user,
                    metadata={"from": old_role, "to": user.role},
                )
        return Response(self.get_serializer(user).data)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    @action(detail=True, methods=("post",))
    def disable(self, request, pk=None):
        user = self.get_object()
        if not user.is_active:
            return Response({"detail": "Account is already inactive."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            user.is_active = False
            user.save(update_fields=("is_active", "updated_at"))
            revoke_user_sessions(user)
            record_security_event(
                action=AuditAction.ACCOUNT_DISABLED, target_user=user, actor=request.user
            )
        return Response(self.get_serializer(user).data)

    @action(detail=True, methods=("post",))
    def reactivate(self, request, pk=None):
        user = self.get_object()
        if user.is_active:
            return Response({"detail": "Account is already active."}, status=status.HTTP_400_BAD_REQUEST)
        if not user.has_usable_password():
            return Response(
                {"detail": "Pending accounts must complete password setup before activation."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            user.is_active = True
            user.save(update_fields=("is_active", "updated_at"))
            record_security_event(
                action=AuditAction.ACCOUNT_REACTIVATED, target_user=user, actor=request.user
            )
        return Response(self.get_serializer(user).data)

    @action(detail=True, methods=("post",), url_path="resend-invite")
    def resend_invite(self, request, pk=None):
        user = self.get_object()
        if user.is_active or user.has_usable_password():
            return Response(
                {"detail": "Invitations can only be resent to accounts pending setup."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            # Rotating the unusable password invalidates previously issued setup tokens.
            user.set_unusable_password()
            user.auth_version += 1
            user.save(update_fields=("password", "auth_version", "updated_at"))
            transaction.on_commit(lambda: send_invite_email(user, request.user))
        return Response({"detail": "Setup invitation generated."})
