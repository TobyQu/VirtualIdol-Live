from django.urls import path
from . import views

urlpatterns = [
    path('tts/generate/', views.generate, name='generate'),
    path('tts/stream/', views.generate_stream, name='generate_stream'),
    path('tts/voices/', views.get_voices, name='voices'),
    path('tts/emotions/', views.get_emotions, name='emotions'),
    path('translation/', views.translation, name='translation'),
]
