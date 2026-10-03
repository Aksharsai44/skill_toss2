from apps.accounts.models import UserRole
from apps.accounts.permissions import HasRoles


class IsAcademicStaff(HasRoles):
    allowed_roles = frozenset({UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER})


class IsStudent(HasRoles):
    allowed_roles = frozenset({UserRole.STUDENT})
