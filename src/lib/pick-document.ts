// Client-safe. Opens the OS document picker restricted to Word/Excel/PDF and
// returns a ready-to-upload FormData, or null if the user cancelled.
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export async function pickAttachment(): Promise<FormData | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ALLOWED_MIME_TYPES });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];

  const form = new FormData();
  if (Platform.OS === 'web' && (asset as any).file) {
    form.append('file', (asset as any).file, asset.name);
  } else {
    form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/octet-stream' } as any);
  }
  return form;
}
