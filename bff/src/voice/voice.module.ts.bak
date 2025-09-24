import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { DbModule } from '../db/db.module';
import { VoiceEvalRepo } from './voice-eval.repo';

@Module({
  imports: [
    DbModule,
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit for audio files
      },
      fileFilter: (req, file, callback) => {
        // Accept audio files
        if (!file.mimetype.startsWith('audio/')) {
          return callback(new Error('Only audio files are allowed'), false);
        }
        callback(null, true);
      },
    }),
  ],
  controllers: [VoiceController],
  providers: [VoiceService, VoiceEvalRepo],
  exports: [VoiceService],
})
export class VoiceModule {}
