from rest_framework.permissions import BasePermission

from .models import UserRole
from .policies import can_access_educational_record, same_institution


class IsActiveUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active)


class HasRoles(IsActiveUser):
    allowed_roles = frozenset()

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role in self.allowed_roles


class IsProductAdmin(HasRoles):
    allowed_roles = frozenset({UserRole.PRODUCT_ADMIN})


class IsSuperAdmin(HasRoles):
    allowed_roles = frozenset({UserRole.SUPER_ADMIN})


class IsInstitutionAdmin(HasRoles):
    allowed_roles = frozenset({UserRole.ADMIN})


class IsTenantManager(HasRoles):
    allowed_roles = frozenset({UserRole.SUPER_ADMIN, UserRole.ADMIN})


class IsTeacher(HasRoles):
    allowed_roles = frozenset({UserRole.TEACHER})


class IsStudent(HasRoles):
    allowed_roles = frozenset({UserRole.STUDENT})


class IsParent(HasRoles):
    allowed_roles = frozenset({UserRole.PARENT})


class IsSameInstitution(IsActiveUser):
    def has_object_permission(self, request, view, obj):
        return same_institution(request.user, obj)


class CanAccessEducationalRecord(IsActiveUser):
    def has_object_permission(self, request, view, obj):
        return can_access_educational_record(request.user, obj)
