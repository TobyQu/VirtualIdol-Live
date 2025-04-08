from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from apps.speech import views

schema_view = get_schema_view(
    openapi.Info(
        title="VirtualWife API",
        default_version='v1',
        description="VirtualWife API documentation",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="contact@virtualwife.local"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('chatbot/', include('apps.chatbot.urls')),
    path('api/speech/', include('apps.speech.urls')),
    path('api/speech/tts/generate/', views.generate),
    path('api/speech/tts/stream/', views.generate_stream),
    path('api/speech/tts/voices/', views.get_voices),
    path('api/speech/tts/emotions/', views.get_emotions),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 