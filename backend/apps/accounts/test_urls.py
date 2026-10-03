from django.urls import path
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsInstitutionAdmin, IsTeacher


class AdminProbeView(APIView):
    permission_classes = (IsInstitutionAdmin,)

    def get(self, request):
        return Response({"ok": True})


class TeacherProbeView(APIView):
    permission_classes = (IsTeacher,)

    def get(self, request):
        return Response({"ok": True})


urlpatterns = [
    path("admin/", AdminProbeView.as_view()),
    path("teacher/", TeacherProbeView.as_view()),
]
