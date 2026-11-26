from django.urls import path
from . import views

urlpatterns = [
    path("", views.dataset_list, name="dataset-list"),
    path("status/", views.connection_status, name="connection-status"),
    path("connect/", views.connect_database, name="connect-database"),
    path("disconnect/", views.disconnect_database, name="disconnect-database"),
    path(
        "<str:database_name>/<str:collection_name>/preview/",
        views.collection_preview,
        name="collection-preview",
    ),
    path(
        "<str:database_name>/<str:collection_name>/filter/",
        views.filter_collection,
        name="filter-collection",
    ),
    path(
        "<str:database_name>/<str:collection_name>/sample/",
        views.sample_collection,
        name="sample-collection",
    ),
    path(
        "<str:database_name>/<str:collection_name>/schema/",
        views.collection_schema,
        name="collection-schema",
    ),
]