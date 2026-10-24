"""URL configuration for the NLP connector app."""

from django.urls import path
from apps.nlp import views

urlpatterns = [
    path("tasks/", views.task_list, name="nlp-task-list"),
    path("run/", views.run_task, name="nlp-run"),
    path("capabilities/", views.capabilities, name="nlp-capabilities"),
]
