from urllib.parse import parse_qs, urlparse

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from .models import AuditAction, Institution, SecurityAuditEvent, UserRole
from apps.academics.models import (
    Batch,
    Course,
    Department,
    ParentStudentLink,
    StudentEnrollment,
    Subject,
    TeacherAssignment,
)


User = get_user_model()
OLD_PASSWORD = "Old-SkillToss-Password-47!"
NEW_PASSWORD = "New-SkillToss-Password-83!"
RESET_PASSWORD = "Reset-SkillToss-Password-94!"


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class SecurityFlowTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.institution = Institution.objects.create(name="Institution One", code="ONE")
        cls.other_institution = Institution.objects.create(name="Institution Two", code="TWO")
        cls.admin = User.objects.create_user(
            email="admin@one.test",
            password=OLD_PASSWORD,
            full_name="Institution Admin",
            role=UserRole.ADMIN,
            institution=cls.institution,
            is_active=True,
        )
        cls.super_admin = User.objects.create_user(
            email="super@one.test",
            password=OLD_PASSWORD,
            full_name="Super Admin",
            role=UserRole.SUPER_ADMIN,
            institution=cls.institution,
            is_active=True,
        )
        cls.teacher = User.objects.create_user(
            email="teacher@one.test",
            password=OLD_PASSWORD,
            full_name="Teacher One",
            role=UserRole.TEACHER,
            institution=cls.institution,
            is_active=True,
        )
        cls.student = User.objects.create_user(
            email="student@one.test",
            password=OLD_PASSWORD,
            full_name="Student One",
            role=UserRole.STUDENT,
            institution=cls.institution,
            is_active=True,
        )
        cls.parent = User.objects.create_user(
            email="parent@one.test",
            password=OLD_PASSWORD,
            full_name="Parent One",
            role=UserRole.PARENT,
            institution=cls.institution,
            is_active=True,
        )
        cls.other_teacher = User.objects.create_user(
            email="teacher@two.test",
            password=OLD_PASSWORD,
            full_name="Teacher Two",
            role=UserRole.TEACHER,
            institution=cls.other_institution,
            is_active=True,
        )
        cls.department = Department.objects.create(
            institution=cls.institution, name="Computing", code="COMP"
        )
        cls.course = Course.objects.create(
            institution=cls.institution,
            department=cls.department,
            code="CS",
            title="Computer Science",
        )
        cls.subject = Subject.objects.create(
            institution=cls.institution,
            course=cls.course,
            code="PY",
            title="Python",
        )
        cls.batch = Batch.objects.create(
            institution=cls.institution, course=cls.course, name="CS 2026"
        )

    def login(self, user, password=OLD_PASSWORD):
        return self.client.post(
            reverse("auth-login"), {"email": user.email, "password": password}, format="json"
        )

    def invite(self, role=UserRole.TEACHER, email="invited@one.test", **extra):
        self.client.force_authenticate(self.admin)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("user-management-list"),
                {
                    "full_name": "Invited User",
                    "email": email,
                    "role": role,
                    "institution_id": str(self.institution.pk),
                    **extra,
                },
                format="json",
            )
        return response

    def password_link_values(self):
        query = parse_qs(urlparse(mail.outbox[-1].body.splitlines()[-3]).query)
        return query["uid"][0], query["token"][0]

    def test_admin_creates_allowed_pending_users_and_invite_is_audited(self):
        for role in (UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT):
            with self.subTest(role=role):
                response = self.invite(role, f"new-{role}@one.test")
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                user = User.objects.get(email=f"new-{role}@one.test")
                self.assertEqual(user.institution, self.institution)
                self.assertFalse(user.is_active)
                self.assertFalse(user.has_usable_password())
        self.assertEqual(len(mail.outbox), 3)
        self.assertEqual(
            SecurityAuditEvent.objects.filter(action=AuditAction.USER_CREATED).count(), 3
        )
        self.assertEqual(SecurityAuditEvent.objects.filter(action=AuditAction.INVITE_SENT).count(), 3)

    def test_creation_permission_role_escalation_and_tenant_tampering(self):
        self.client.force_authenticate(self.admin)
        base = {"full_name": "Blocked", "email": "blocked@one.test"}
        for role in (UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN, UserRole.ADMIN):
            response = self.client.post(
                reverse("user-management-list"), {**base, "email": f"{role}@one.test", "role": role}
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(
            reverse("user-management-list"),
            {
                **base,
                "role": UserRole.TEACHER,
                "institution_id": str(self.other_institution.pk),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        for actor in (self.teacher, self.student, self.parent):
            self.client.force_authenticate(actor)
            denied = self.client.post(
                reverse("user-management-list"), {**base, "role": UserRole.TEACHER}
            )
            self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

    def test_super_admin_contract_allows_admin_but_not_product_or_super_admin(self):
        self.client.force_authenticate(self.super_admin)
        allowed = self.client.post(
            reverse("user-management-list"),
            {"full_name": "New Admin", "email": "new-admin@one.test", "role": UserRole.ADMIN},
        )
        self.assertEqual(allowed.status_code, status.HTTP_201_CREATED)
        for role in (UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN):
            denied = self.client.post(
                reverse("user-management-list"),
                {"full_name": "No", "email": f"no-{role}@one.test", "role": role},
            )
            self.assertEqual(denied.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_tenant_uuid_and_payload_promotion_are_denied(self):
        self.client.force_authenticate(self.admin)
        detail = reverse("user-management-detail", args=(self.other_teacher.pk,))
        self.assertEqual(self.client.get(detail).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.patch(detail, {"full_name": "Tampered"}).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        own_detail = reverse("user-management-detail", args=(self.teacher.pk,))
        promoted = self.client.patch(own_detail, {"role": UserRole.SUPER_ADMIN}, format="json")
        self.assertEqual(promoted.status_code, status.HTTP_400_BAD_REQUEST)
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.role, UserRole.TEACHER)

    def test_setup_token_activates_once_and_login_works(self):
        response = self.invite()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        uid, token = self.password_link_values()
        payload = {
            "uid": uid,
            "token": token,
            "new_password": NEW_PASSWORD,
            "confirm_password": NEW_PASSWORD,
        }
        setup = self.client.post(reverse("auth-set-password"), payload, format="json")
        self.assertEqual(setup.status_code, status.HTTP_200_OK)
        reused = self.client.post(reverse("auth-set-password"), payload, format="json")
        self.assertEqual(reused.status_code, status.HTTP_400_BAD_REQUEST)
        invited = User.objects.get(email="invited@one.test")
        self.assertTrue(invited.is_active)
        self.assertTrue(invited.check_password(NEW_PASSWORD))
        self.assertTrue(
            SecurityAuditEvent.objects.filter(
                action=AuditAction.PASSWORD_SETUP_COMPLETED, target_user=invited
            ).exists()
        )
        self.assertEqual(self.login(invited, NEW_PASSWORD).status_code, status.HTTP_200_OK)

    def test_relationships_are_validated_then_created_atomically_on_setup(self):
        cases = (
            (
                UserRole.TEACHER,
                "related-teacher@one.test",
                {"batch_id": str(self.batch.pk), "subject_id": str(self.subject.pk)},
            ),
            (UserRole.STUDENT, "related-student@one.test", {"batch_id": str(self.batch.pk)}),
            (
                UserRole.PARENT,
                "related-parent@one.test",
                {"student_id": str(self.student.pk), "relationship": "Guardian"},
            ),
        )
        for role, email, relationship_data in cases:
            with self.subTest(role=role):
                invited = self.invite(role, email, **relationship_data)
                self.assertEqual(invited.status_code, status.HTTP_201_CREATED)
                uid, token = self.password_link_values()
                setup = self.client.post(
                    reverse("auth-set-password"),
                    {
                        "uid": uid,
                        "token": token,
                        "new_password": NEW_PASSWORD,
                        "confirm_password": NEW_PASSWORD,
                    },
                    format="json",
                )
                self.assertEqual(setup.status_code, status.HTTP_200_OK)
        teacher = User.objects.get(email="related-teacher@one.test")
        student = User.objects.get(email="related-student@one.test")
        parent = User.objects.get(email="related-parent@one.test")
        self.assertTrue(
            TeacherAssignment.objects.filter(
                teacher=teacher, batch=self.batch, subject=self.subject, is_active=True
            ).exists()
        )
        self.assertTrue(
            StudentEnrollment.objects.filter(student=student, batch=self.batch, status="active").exists()
        )
        self.assertTrue(
            ParentStudentLink.objects.filter(
                parent=parent, student=self.student, relationship="Guardian"
            ).exists()
        )
        self.assertEqual(teacher.provisioning_data, {})
        self.assertEqual(student.provisioning_data, {})
        self.assertEqual(parent.provisioning_data, {})

    def test_cross_tenant_relationship_is_rejected_without_partial_user(self):
        response = self.invite(
            UserRole.TEACHER,
            "bad-relation@one.test",
            batch_id=str(Batch.objects.create(
                institution=self.other_institution,
                course=Course.objects.create(
                    institution=self.other_institution,
                    department=Department.objects.create(
                        institution=self.other_institution, name="Other", code="OTHER"
                    ),
                    code="OTHER",
                    title="Other",
                ),
                name="Other batch",
            ).pk),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="bad-relation@one.test").exists())

    @override_settings(PASSWORD_RESET_TIMEOUT=-1)
    def test_expired_setup_token_fails(self):
        self.invite()
        uid, token = self.password_link_values()
        response = self.client.post(
            reverse("auth-set-password"),
            {"uid": uid, "token": token, "new_password": NEW_PASSWORD, "confirm_password": NEW_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_forgot_password_is_non_enumerating(self):
        with self.captureOnCommitCallbacks(execute=True):
            existing = self.client.post(
                reverse("auth-forgot-password"), {"email": self.teacher.email}, format="json"
            )
        missing = self.client.post(
            reverse("auth-forgot-password"), {"email": "missing@one.test"}, format="json"
        )
        self.assertEqual(existing.status_code, status.HTTP_200_OK)
        self.assertEqual(missing.status_code, status.HTTP_200_OK)
        self.assertEqual(existing.data, missing.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            SecurityAuditEvent.objects.filter(
                action=AuditAction.PASSWORD_RESET_REQUESTED, target_user=self.teacher
            ).count(),
            1,
        )

    def test_reset_password_revokes_old_tokens_and_requires_fresh_login(self):
        login = self.login(self.teacher)
        old_access = login.data["access"]
        old_refresh = login.data["refresh"]
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                reverse("auth-forgot-password"), {"email": self.teacher.email}, format="json"
            )
        uid, token = self.password_link_values()
        reset = self.client.post(
            reverse("auth-reset-password"),
            {
                "uid": uid,
                "token": token,
                "new_password": RESET_PASSWORD,
                "confirm_password": RESET_PASSWORD,
            },
            format="json",
        )
        self.assertEqual(reset.status_code, status.HTTP_200_OK)
        self.assertEqual(self.login(self.teacher).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.login(self.teacher, RESET_PASSWORD).status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {old_access}")
        self.assertEqual(self.client.get(reverse("auth-me")).status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.credentials()
        self.assertEqual(
            self.client.post(reverse("auth-token-refresh"), {"refresh": old_refresh}).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertTrue(
            SecurityAuditEvent.objects.filter(
                action=AuditAction.PASSWORD_RESET_COMPLETED, target_user=self.teacher
            ).exists()
        )

    def test_reset_rejects_invalid_token_and_weak_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.teacher.pk))
        invalid = self.client.post(
            reverse("auth-reset-password"),
            {"uid": uid, "token": "invalid", "new_password": NEW_PASSWORD, "confirm_password": NEW_PASSWORD},
        )
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        token = default_token_generator.make_token(self.teacher)
        weak = self.client.post(
            reverse("auth-reset-password"),
            {"uid": uid, "token": token, "new_password": "password", "confirm_password": "password"},
        )
        self.assertEqual(weak.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(PASSWORD_RESET_TIMEOUT=-1)
    def test_expired_reset_token_fails(self):
        uid = urlsafe_base64_encode(force_bytes(self.teacher.pk))
        token = default_token_generator.make_token(self.teacher)
        response = self.client.post(
            reverse("auth-reset-password"),
            {"uid": uid, "token": token, "new_password": NEW_PASSWORD, "confirm_password": NEW_PASSWORD},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_validation_success_and_session_revocation(self):
        login = self.login(self.teacher)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        endpoint = reverse("auth-change-password")
        wrong = self.client.post(
            endpoint,
            {"current_password": "wrong", "new_password": NEW_PASSWORD, "confirm_password": NEW_PASSWORD},
        )
        self.assertEqual(wrong.status_code, status.HTTP_400_BAD_REQUEST)
        mismatch = self.client.post(
            endpoint,
            {"current_password": OLD_PASSWORD, "new_password": NEW_PASSWORD, "confirm_password": "different"},
        )
        self.assertEqual(mismatch.status_code, status.HTTP_400_BAD_REQUEST)
        weak = self.client.post(
            endpoint,
            {"current_password": OLD_PASSWORD, "new_password": "password", "confirm_password": "password"},
        )
        self.assertEqual(weak.status_code, status.HTTP_400_BAD_REQUEST)
        changed = self.client.post(
            endpoint,
            {"current_password": OLD_PASSWORD, "new_password": NEW_PASSWORD, "confirm_password": NEW_PASSWORD},
        )
        self.assertEqual(changed.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(reverse("auth-me")).status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.credentials()
        self.assertEqual(self.login(self.teacher).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.login(self.teacher, NEW_PASSWORD).status_code, status.HTTP_200_OK)
        self.assertTrue(
            SecurityAuditEvent.objects.filter(
                action=AuditAction.PASSWORD_CHANGED, target_user=self.teacher
            ).exists()
        )

    def test_disable_blocks_login_access_and_refresh_then_reactivate_restores_login(self):
        login = self.login(self.teacher)
        self.client.force_authenticate(self.admin)
        disabled = self.client.post(
            reverse("user-management-disable", args=(self.teacher.pk,)), format="json"
        )
        self.assertEqual(disabled.status_code, status.HTTP_200_OK)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.login(self.teacher).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            self.client.post(
                reverse("auth-token-refresh"), {"refresh": login.data["refresh"]}, format="json"
            ).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.client.force_authenticate(self.admin)
        restored = self.client.post(
            reverse("user-management-reactivate", args=(self.teacher.pk,)), format="json"
        )
        self.assertEqual(restored.status_code, status.HTTP_200_OK)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.login(self.teacher).status_code, status.HTTP_200_OK)
        actions = set(
            SecurityAuditEvent.objects.filter(target_user=self.teacher).values_list("action", flat=True)
        )
        self.assertTrue(
            {AuditAction.ACCOUNT_DISABLED, AuditAction.ACCOUNT_REACTIVATED}.issubset(actions)
        )

    def test_permitted_role_change_revokes_sessions_and_is_audited(self):
        login = self.login(self.teacher)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            reverse("user-management-detail", args=(self.teacher.pk,)),
            {"role": UserRole.STUDENT},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.post(
                reverse("auth-token-refresh"), {"refresh": login.data["refresh"]}, format="json"
            ).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertTrue(
            SecurityAuditEvent.objects.filter(
                action=AuditAction.ROLE_CHANGED,
                target_user=self.teacher,
                metadata={"from": UserRole.TEACHER, "to": UserRole.STUDENT},
            ).exists()
        )

    def test_pending_account_cannot_be_manually_reactivated(self):
        self.invite()
        pending = User.objects.get(email="invited@one.test")
        response = self.client.post(
            reverse("user-management-reactivate", args=(pending.pk,)), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
