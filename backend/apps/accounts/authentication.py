from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class VersionedJWTAuthentication(JWTAuthentication):
    """Reject every token issued before a security-sensitive account change."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if validated_token.get("auth_version") != user.auth_version:
            raise AuthenticationFailed("This session is no longer valid.", code="session_revoked")
        return user
