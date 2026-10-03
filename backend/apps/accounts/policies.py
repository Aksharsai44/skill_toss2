from collections.abc import Iterable

from .models import UserRole


TENANT_MANAGER_TARGET_ROLES = {
    UserRole.SUPER_ADMIN: {UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT},
    UserRole.ADMIN: {UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT},
}


def object_institution_id(obj):
    return getattr(obj, "institution_id", None) or getattr(
        getattr(obj, "institution", None), "id", None
    )


def same_institution(actor, obj) -> bool:
    return bool(
        actor.is_authenticated
        and actor.is_active
        and actor.institution_id
        and actor.institution_id == object_institution_id(obj)
    )


def can_manage_user(actor, target) -> bool:
    allowed_targets = TENANT_MANAGER_TARGET_ROLES.get(actor.role, set())
    return same_institution(actor, target) and target.role in allowed_targets


def can_read_user(actor, target) -> bool:
    return actor.is_authenticated and actor.is_active and (
        actor.pk == target.pk or can_manage_user(actor, target)
    )


def _ids(obj, plural_name: str, singular_name: str) -> set:
    values = getattr(obj, plural_name, ()) or ()
    if not isinstance(values, Iterable) or isinstance(values, (str, bytes)):
        values = ()
    result = set(values)
    single = getattr(obj, singular_name, None)
    if single is not None:
        result.add(single)
    return result


def can_access_educational_record(actor, obj) -> bool:
    """Foundation policy used by future academic models and their DRF permissions.

    Models expose authoritative assignment/ownership/link UUIDs; callers must also scope querysets.
    Product Admin is deliberately denied educational data.
    """
    if not same_institution(actor, obj) or actor.role == UserRole.PRODUCT_ADMIN:
        return False
    if actor.role in {UserRole.SUPER_ADMIN, UserRole.ADMIN}:
        return True
    if actor.role == UserRole.TEACHER:
        return actor.pk in _ids(obj, "assigned_teacher_ids", "teacher_profile_id")
    if actor.role == UserRole.STUDENT:
        return actor.pk in _ids(obj, "student_profile_ids", "student_profile_id")
    if actor.role == UserRole.PARENT:
        return actor.pk in _ids(obj, "linked_parent_profile_ids", "parent_profile_id")
    return False
