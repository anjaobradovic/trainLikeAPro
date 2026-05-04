from django.db import models


class CatalogItem(models.Model):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='catalog/', blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['name']

    def __str__(self):
        return self.name


class Equipment(CatalogItem):
    class Meta(CatalogItem.Meta):
        verbose_name_plural = 'equipment'


class Accessory(CatalogItem):
    class Meta(CatalogItem.Meta):
        verbose_name_plural = 'accessories'


class TrainingGoal(models.Model):
    name = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
