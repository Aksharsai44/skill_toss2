from rest_framework.routers import DefaultRouter

from .views import ActivityEventViewSet, DailyGoalViewSet, DailyTaskViewSet


router = DefaultRouter()
router.register("daily-goals", DailyGoalViewSet, basename="daily-goal")
router.register("daily-tasks", DailyTaskViewSet, basename="daily-task")
router.register("activity-events", ActivityEventViewSet, basename="activity-event")

urlpatterns = router.urls
