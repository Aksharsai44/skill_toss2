from rest_framework import mixins, viewsets

from apps.accounts.permissions import IsActiveUser, IsStudent

from .serializers import ActivityEventSerializer, DailyGoalSerializer, DailyTaskSerializer
from .services import get_activity_events_for_user, get_daily_goals_for_user, get_daily_tasks_for_user


class StudentOwnedTrackerViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    http_method_names = ("get", "post", "patch", "head", "options")

    def get_permissions(self):
        classes = [IsActiveUser]
        if self.action in {"create", "update", "partial_update"}:
            classes.append(IsStudent)
        return [permission() for permission in classes]

    def filter_student(self, queryset):
        student_id = self.request.query_params.get("student_id")
        return queryset.filter(student_id=student_id) if student_id else queryset


class DailyGoalViewSet(StudentOwnedTrackerViewSet):
    serializer_class = DailyGoalSerializer

    def get_queryset(self):
        return self.filter_student(get_daily_goals_for_user(self.request.user))


class DailyTaskViewSet(StudentOwnedTrackerViewSet):
    serializer_class = DailyTaskSerializer

    def get_queryset(self):
        queryset = self.filter_student(get_daily_tasks_for_user(self.request.user))
        activity_date = self.request.query_params.get("date")
        return queryset.filter(activity_date=activity_date) if activity_date else queryset


class ActivityEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityEventSerializer
    permission_classes = (IsActiveUser,)

    def get_queryset(self):
        queryset = get_activity_events_for_user(self.request.user)
        student_id = self.request.query_params.get("student_id")
        return queryset.filter(student_id=student_id) if student_id else queryset
