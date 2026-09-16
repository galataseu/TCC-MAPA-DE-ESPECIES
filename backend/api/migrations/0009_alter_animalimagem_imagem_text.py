# Uploads (fotos e ícones) passam a ir para o banco como data URL, para
# sobreviver a hospedagem com disco efêmero (Vercel/Render). TEXT sem limite.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_alter_animalimagem_imagem'),
    ]

    operations = [
        migrations.AlterField(
            model_name='animalimagem',
            name='imagem',
            field=models.TextField(help_text='URL remota, /media/... legado ou data URL'),
        ),
    ]
