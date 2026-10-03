from datetime import timedelta
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from .models import Institution, UserRole
from .policies import can_access_educational_record, can_manage_user
from .serializers import UserMeSerializer


User = get_user_model()
PASSWORD = "Local-test-password-47!"


class AuthApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.institution = Institution.objects.create(name="Institution One", code="ONE")
        cls.other_institution = Institution.objects.create(name="Institution Two", code="TWO")
        cls.users = {}
        for role in UserRole.values:
            cls.users[role] = User.objects.create_user(
                email=f"{role}@example.test",
                password=PASSWORD,
                full_name=role.replace("_", " ").title(),
                role=role,
                institution=None if role == UserRole.PRODUCT_ADMIN else cls.institution,
                is_active=True,
            )
        cls.inactive = User.objects.create_user(
            email="inactive@example.test",
            password=PASSWORD,
            full_name="Inactive User",
            role=UserRole.STUDENT,
            institution=cls.institution,
            is_active=False,
        )

    def login(self, user, password=PASSWORD):
        return self.client.post(
            reverse("auth-login"), {"email": user.email, "password": password}, format="json"
        )

    def test_all_six_roles_can_login_and_receive_authoritative_role(self):
        for role, user in self.users.items():
            with self.subTest(role=role):
                response = self.login(user)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data["user"]["role"], role)
                self.assertIn("access", response.data)
                self.assertIn("refresh", response.data)
                self.assertNotIn("password", response.data["user"])

    def test_six_role_contract_is_exact(self):
        self.assertEqual(
            set(UserRole.values),
            {"super_admin", "product_admin", "admin", "teacher", "student", "parent"},
        )

    def test_invalid_nonexistent_and_inactive_login(self):
        wrong = self.login(self.users[UserRole.STUDENT], "wrong-password")
        missing = self.client.post(
            reverse("auth-login"),
            {"email": "missing@example.test", "password": PASSWORD},
            format="json",
        )
        inactive = self.login(self.inactive)
        self.assertEqual(wrong.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(missing.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(inactive.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_cannot_refresh(self):
        user = self.users[UserRole.STUDENT]
        login = self.login(user)
        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])
        response = self.client.post(
            reverse("auth-token-refresh"), {"refresh": login.data["refresh"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_token_me_refresh_malformed_and_expired(self):
        login = self.login(self.users[UserRole.TEACHER])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        me = self.client.get(reverse("auth-me"))
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["email"], self.users[UserRole.TEACHER].email)

        self.client.credentials()
        refreshed = self.client.post(
            reverse("auth-token-refresh"), {"refresh": login.data["refresh"]}, format="json"
        )
        self.assertEqual(refreshed.status_code, status.HTTP_200_OK)
        self.assertIn("access", refreshed.data)

        self.client.credentials(HTTP_AUTHORIZATION="Bearer malformed")
        self.assertEqual(self.client.get(reverse("auth-me")).status_code, status.HTTP_401_UNAUTHORIZED)

        expired = AccessToken.for_user(self.users[UserRole.TEACHER])
        expired.set_exp(lifetime=timedelta(seconds=-1))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {expired}")
        self.assertEqual(self.client.get(reverse("auth-me")).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_token(self):
        login = self.login(self.users[UserRole.STUDENT])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        response = self.client.post(
            reverse("auth-logout"), {"refresh": login.data["refresh"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.client.credentials()
        retry = self.client.post(
            reverse("auth-token-refresh"), {"refresh": login.data["refresh"]}, format="json"
        )
        self.assertEqual(retry.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_role_is_read_only_and_cannot_be_mass_assigned(self):
        student = self.users[UserRole.STUDENT]
        serializer = UserMeSerializer(student, data={"role": UserRole.ADMIN}, partial=True)
        self.assertTrue(serializer.is_valid())
        serializer.save()
        student.refresh_from_db()
        self.assertEqual(student.role, UserRole.STUDENT)


@override_settings(ROOT_URLCONF="apps.accounts.test_urls")
class RolePermissionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        institution = Institution.objects.create(name="Institution One", code="ONE")
        cls.teacher = User.objects.create_user(
            email="teacher@example.test", password=PASSWORD, full_name="Teacher",
            role=UserRole.TEACHER, institution=institution, is_active=True,
        )
        cls.parent = User.objects.create_user(
            email="parent@example.test", password=PASSWORD, full_name="Parent",
            role=UserRole.PARENT, institution=institution, is_active=True,
        )

    def test_teacher_cannot_access_admin_endpoint(self):
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.client.get("/admin/").status_code, status.HTTP_403_FORBIDDEN)

    def test_parent_cannot_access_teacher_endpoint(self):
        self.client.force_authenticate(self.parent)
        self.assertEqual(self.client.get("/teacher/").status_code, status.HTTP_403_FORBIDDEN)


class TenantPolicyTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.one = Institution.objects.create(name="Institution One", code="ONE")
        cls.two = Institution.objects.create(name="Institution Two", code="TWO")
        cls.admin = User.objects.create_user(
            email="admin@example.test", password=PASSWORD, full_name="Admin",
            role=UserRole.ADMIN, institution=cls.one, is_active=True,
        )
        cls.teacher = User.objects.create_user(
            email="teacher@example.test", password=PASSWORD, full_name="Teacher",
            role=UserRole.TEACHER, institution=cls.one, is_active=True,
        )
        cls.student = User.objects.create_user(
            email="student@example.test", password=PASSWORD, full_name="Student",
            role=UserRole.STUDENT, institution=cls.one, is_active=True,
        )
        cls.parent = User.objects.create_user(
            email="parent@example.test", password=PASSWORD, full_name="Parent",
            role=UserRole.PARENT, institution=cls.one, is_active=True,
        )
        cls.other_student = User.objects.create_user(
            email="other@example.test", password=PASSWORD, full_name="Other Student",
            role=UserRole.STUDENT, institution=cls.two, is_active=True,
        )

    def record(self, **kwargs):
        values = {"institution_id": self.one.id}
        values.update(kwargs)
        return SimpleNamespace(**values)

    def test_admin_and_teacher_cannot_cross_institution(self):
        self.assertFalse(can_manage_user(self.admin, self.other_student))
        cross_tenant_record = self.record(institution_id=self.two.id, assigned_teacher_ids={self.teacher.id})
        self.assertFalse(can_access_educational_record(self.teacher, cross_tenant_record))

    def test_student_cannot_access_unrelated_identity(self):
        record = self.record(student_profile_id=self.other_student.id)
        self.assertFalse(can_access_educational_record(self.student, record))

    def test_parent_requires_explicit_link(self):
        unrelated = self.record(linked_parent_profile_ids=set())
        linked = self.record(linked_parent_profile_ids={self.parent.id})
        self.assertFalse(can_access_educational_record(self.parent, unrelated))
        self.assertTrue(can_access_educational_record(self.parent, linked))
