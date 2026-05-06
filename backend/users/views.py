from rest_framework import generics, permissions, serializers as drf_serializers
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .serializers import RegisterClientSerializer, RegisterTrainerSerializer, UserSerializer
from .models import User, TrainerProfile


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if user.is_deleted:
            raise drf_serializers.ValidationError('This account has been removed.')
        if user.role == User.Role.TRAINER:
            profile = getattr(user, 'trainer_profile', None)
            if profile is None or profile.is_deleted:
                raise drf_serializers.ValidationError('This account has been removed.')
            if profile.status == TrainerProfile.Status.PENDING:
                raise drf_serializers.ValidationError('Your trainer account is awaiting admin approval.')
            if profile.status == TrainerProfile.Status.REJECTED:
                raise drf_serializers.ValidationError('Your trainer registration was rejected.')
            if profile.status != TrainerProfile.Status.APPROVED:
                raise drf_serializers.ValidationError('This account cannot log in.')
        data['role'] = user.role
        data['username'] = user.username
        data['email'] = user.email
        data['id'] = user.id
        return data


class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterClientView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterClientSerializer


class RegisterTrainerView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterTrainerSerializer


class MeView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class AllUsersView(generics.ListAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer