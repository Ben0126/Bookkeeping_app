// Dexie's liveQuery compares keys with the global indexedDB, which happy-dom
// lacks. Each test still gets its own database from createTestDb().
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import i18n from '../i18n';

await i18n.changeLanguage('en-US');
