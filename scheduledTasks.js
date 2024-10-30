const cron = require('node-cron');
const Track = require('./models/Track');
const Status = require('./models/Status'); // Модель статуса

// Запуск задачи каждый день в полночь
cron.schedule('0 8 * * *', async () => {
  console.log('Запуск задачи для автоматического обновления статусов треков');

  try {
    // Получаем статус "Получено на складе в Китае"
    const receivedStatus = await Status.findOne({ statusText: 'Получено на складе в Китае' });
    const nextStatus = await Status.findOne({ statusText: 'Граница' });
    
    if (!receivedStatus || !nextStatus) {
      console.error('Не удалось найти статусы для обновления');
      return;
    }

    // Находим треки с последним статусом "Получено на складе в Китае"
    const tracks = await Track.find({ 
      status: receivedStatus._id, 
      "history.status": receivedStatus._id 
    });

    const now = new Date();

    for (const track of tracks) {
      // Ищем последний статус "Получено на складе в Китае" в истории
      const lastStatusEntry = track.history
        .reverse() // Реверсируем массив, чтобы взять последний элемент
        .find(historyItem => historyItem.status.equals(receivedStatus._id));

      if (lastStatusEntry && (now - new Date(lastStatusEntry.date)) >= 4 * 24 * 60 * 60 * 1000) {
        // Добавляем статус "Граница" через 4 дня после "Получено на складе в Китае"
        track.history.push({
          status: nextStatus._id,
          date: now
        });

        // Обновляем текущий статус трека
        track.status = nextStatus._id;

        // Сохраняем обновленный трек
        await track.save();
        console.log(`Обновлен трек ${track.track}: добавлен статус "Граница"`);
      }
    }
  } catch (error) {
    console.error('Ошибка при обновлении статусов треков:', error);
  }
});
