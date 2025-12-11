import { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../../types';

export function validateCreateRoom(req: Request, res: Response, next: NextFunction): void {
  const errors: string[] = [];
  const { name, description, isPublic, maxUsers, tags, settings } = req.body;

  // Name validation
  if (!name || typeof name !== 'string') {
    errors.push('Name is required');
  } else if (name.length < 3) {
    errors.push('Name must be at least 3 characters');
  } else if (name.length > CONFIG.MAX_ROOM_NAME_LENGTH) {
    errors.push(`Name must be at most ${CONFIG.MAX_ROOM_NAME_LENGTH} characters`);
  }

  // Description validation
  if (description && typeof description === 'string') {
    if (description.length > CONFIG.MAX_DESCRIPTION_LENGTH) {
      errors.push(`Description must be at most ${CONFIG.MAX_DESCRIPTION_LENGTH} characters`);
    }
  }

  // Public/Private validation
  if (typeof isPublic !== 'boolean') {
    errors.push('isPublic must be a boolean');
  }

  // Password validation for private rooms
  if (isPublic === false && !req.body.password) {
    errors.push('Password is required for private rooms');
  }

  if (req.body.password && req.body.password.length < 4) {
    errors.push('Password must be at least 4 characters');
  }

  // Max users validation
  if (!maxUsers || typeof maxUsers !== 'number') {
    errors.push('maxUsers is required and must be a number');
  } else if (maxUsers < 1 || maxUsers > 50) {
    errors.push('maxUsers must be between 1 and 50');
  }

  // Tags validation
  if (!Array.isArray(tags)) {
    errors.push('tags must be an array');
  } else if (tags.length > CONFIG.MAX_TAGS) {
    errors.push(`Maximum ${CONFIG.MAX_TAGS} tags allowed`);
  } else if (!tags.every((tag: any) => typeof tag === 'string')) {
    errors.push('All tags must be strings');
  }

  // Settings validation
  if (!settings || typeof settings !== 'object') {
    errors.push('settings is required and must be an object');
  } else {
    validateSettings(settings, errors);
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors,
    });
    return;
  }

  next();
}

export function validateJoinRoom(req: Request, res: Response, next: NextFunction): void {
  const { password } = req.body;

  if (password && typeof password !== 'string') {
    res.status(400).json({
      error: 'Password must be a string',
    });
    return;
  }

  next();
}

function validateSettings(settings: any, errors: string[]): void {
  const requiredBooleans = [
    'allowDrawing',
    'allowChat',
    'allowExport',
    'requireApproval',
    'enableGrid',
    'enableRulers',
    'autoSave',
  ];

  requiredBooleans.forEach(field => {
    if (typeof settings[field] !== 'boolean') {
      errors.push(`settings.${field} must be a boolean`);
    }
  });

  if (!settings.backgroundColor || typeof settings.backgroundColor !== 'string') {
    errors.push('settings.backgroundColor is required');
  } else if (!/^#[0-9A-Fa-f]{6}$/.test(settings.backgroundColor)) {
    errors.push('settings.backgroundColor must be a valid hex color');
  }

  const validCanvasSizes = ['small', 'medium', 'large', 'custom'];
  if (!validCanvasSizes.includes(settings.canvasSize)) {
    errors.push('settings.canvasSize must be one of: ' + validCanvasSizes.join(', '));
  }

  if (settings.canvasSize === 'custom') {
    if (!settings.customWidth || settings.customWidth < 400) {
      errors.push('settings.customWidth must be at least 400');
    }
    if (!settings.customHeight || settings.customHeight < 300) {
      errors.push('settings.customHeight must be at least 300');
    }
  }

  if (!settings.historyLimit || settings.historyLimit < 5 || settings.historyLimit > 100) {
    errors.push('settings.historyLimit must be between 5 and 100');
  }
}