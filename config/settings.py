
"""
Django settings for config project.
"""

from pathlib import Path

# Project root directory
BASE_DIR = Path(__file__).resolve().parent.parent


# Security settings
# For local development only. Keep secret keys out of public repositories.
SECRET_KEY = "django-insecure-a#x2zlt*61)v7jy%12*-fbhui_3u1#@wiuq#z*iuj&r8z(lah0"

DEBUG = True

ALLOWED_HOSTS = ["127.0.0.1", "localhost"]


# Installed applications
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party applications
    "rest_framework",

    # Project applications
    "datasets",
    "apps.nlp",
]


# Middleware
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# URL configuration
ROOT_URLCONF = "config.urls"


# Template configuration
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",

        # Allows Django to find templates/dashboard.html
        "DIRS": [BASE_DIR / "templates"],

        # Also searches for templates inside installed apps
        "APP_DIRS": True,

        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# WSGI application
WSGI_APPLICATION = "config.wsgi.application"


# Django's built-in database (SQLite)
# MongoDB is accessed separately through PyMongo in database/mongodb.py.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript)
STATIC_URL = "static/"


# Email configuration
# Emails are printed in the terminal during development.
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
