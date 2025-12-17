import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const METADATA_FILE = path.join(DATA_DIR, 'metadata.json');
const RECORDINGS_DIR = path.join(DATA_DIR, 'recordings');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// User storage
export interface User {
  userId: string;
  username: string;
  createdAt: number;
}

export function readUsers(): User[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
}

export function writeUsers(users: User[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing users:', error);
  }
}

export function findUserByUsername(username: string): User | undefined {
  const users = readUsers();
  return users.find(u => u.username === username);
}

export function addUser(user: User): void {
  const users = readUsers();
  users.push(user);
  writeUsers(users);
}

// Recording metadata storage
export type RecordingType = 'audio' | 'video' | 'both';

export interface Recording {
  recordingId: string;
  userId: string;
  meetingId: string;
  username: string;
  title: string;
  filename: string;
  duration: number;
  createdAt: number;
  recordingType?: RecordingType;
}

export function readRecordings(): Recording[] {
  try {
    if (!fs.existsSync(METADATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading recordings:', error);
    return [];
  }
}

export function writeRecordings(recordings: Recording[]): void {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(recordings, null, 2));
  } catch (error) {
    console.error('Error writing recordings:', error);
  }
}

export function addRecording(recording: Recording): void {
  const recordings = readRecordings();
  recordings.push(recording);
  writeRecordings(recordings);
}

export function findRecordingById(recordingId: string): Recording | undefined {
  const recordings = readRecordings();
  return recordings.find(r => r.recordingId === recordingId);
}

export function updateRecording(recordingId: string, updates: Partial<Recording>): boolean {
  const recordings = readRecordings();
  const index = recordings.findIndex(r => r.recordingId === recordingId);
  
  if (index === -1) {
    return false;
  }
  
  recordings[index] = { ...recordings[index], ...updates };
  writeRecordings(recordings);
  return true;
}

export function deleteRecording(recordingId: string): boolean {
  const recordings = readRecordings();
  const filtered = recordings.filter(r => r.recordingId !== recordingId);
  
  if (filtered.length === recordings.length) {
    return false; // Recording not found
  }
  
  writeRecordings(filtered);
  return true;
}

export function getRecordingsByUserId(userId: string): Recording[] {
  const recordings = readRecordings();
  return recordings.filter(r => r.userId === userId);
}

export function getRecordingFilePath(filename: string): string {
  return path.join(RECORDINGS_DIR, filename);
}

