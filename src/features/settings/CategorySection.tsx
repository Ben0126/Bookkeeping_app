import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLedgerDb } from '../../app/ledgerContext';
import {
  createCategory,
  listCategories,
  updateCategory,
  type Category,
  type CategoryKind,
} from '../../core';
import { ErrorBanner, Field, Segmented } from '../../ui/form';
import { PlusIcon } from '../../ui/icons';
import { Modal, ModalFooter } from '../../ui/Modal';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '../../ui/styles';
import { useDiscardGuard } from '../../ui/useDiscardGuard';
import { useFormat } from '../../ui/useFormat';

const ICON_CHOICES = [
  '🍜', '☕', '🛒', '🚌', '🚆', '🛍️', '🎬', '📱', '🏠', '💡', '📚', '🏥',
  '✈️', '🧾', '🎓', '🛡️', '🛂', '🏋️', '🎁', '🐾', '💇', '🍺', '🎮', '💼',
  '💰', '📈', '➕', '📦', '🏷️',
];

/** Lets people hide categories they never use, rename them, and add their own. */
export function CategorySection() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const { setDirty, confirmDiscard } = useDiscardGuard(t('transactionForm.discardConfirm'));
  const categories = useLiveQuery(() => listCategories(db, { kind, includeArchived: true }), [db, kind]);

  return (
    <section aria-labelledby="categories-title" className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <h2 id="categories-title" className="font-semibold">
        {t('categorySettings.title')}
      </h2>
      <p className="text-sm text-slate-600">{t('categorySettings.intro')}</p>
      <Segmented<CategoryKind>
        label={t('categorySettings.kind')}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'expense', label: t('kinds.expense') },
          { value: 'income', label: t('kinds.income') },
        ]}
      />
      <ul className="divide-y divide-slate-100">
        {categories?.map((category) => {
          const name = fmt.categoryName(category);
          return (
            <li key={category.id} className="flex items-center gap-2 py-1.5">
              <button
                type="button"
                onClick={() => setEditing(category)}
                aria-label={t('categorySettings.editNamed', { name })}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-slate-50"
              >
                <span className={`text-xl ${category.archived ? 'opacity-40' : ''}`} aria-hidden="true">
                  {category.icon ?? '🏷️'}
                </span>
                <span className={`truncate ${category.archived ? 'text-slate-400' : 'text-slate-900'}`}>{name}</span>
              </button>
              <Switch
                checked={!category.archived}
                label={t('categorySettings.showNamed', { name })}
                onChange={(shown) => void updateCategory(db, category.id, { archived: !shown })}
              />
            </li>
          );
        })}
      </ul>
      <button type="button" className={secondaryButtonClass} onClick={() => setEditing('new')}>
        <PlusIcon />
        {t('categorySettings.add')}
      </button>

      {editing && (
        <Modal
          title={editing === 'new' ? t('categorySettings.add') : t('categorySettings.edit')}
          onClose={() => confirmDiscard() && setEditing(null)}
        >
          <CategoryForm
            kind={kind}
            category={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
            onDirtyChange={setDirty}
          />
        </Modal>
      )}
    </section>
  );
}

function CategoryForm({
  kind,
  category,
  onDone,
  onDirtyChange,
}: {
  kind: CategoryKind;
  category?: Category;
  onDone: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const db = useLedgerDb();
  const id = useId();
  const [initial] = useState(() => ({
    name: category ? fmt.categoryName(category) : '',
    icon: category?.icon ?? '🏷️',
  }));
  const [name, setName] = useState(initial.name);
  const [icon, setIcon] = useState(initial.icon);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => onDirtyChange(name !== initial.name || icon !== initial.icon), [name, icon, initial, onDirtyChange]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (category) {
        // Only send the name when it changed, so built-ins keep following the app language.
        await updateCategory(db, category.id, { icon, ...(name.trim() !== initial.name ? { name } : {}) });
      } else {
        await createCategory(db, { kind, name, icon });
      }
      onDone();
    } catch (cause) {
      setError(fmt.error(cause));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4 pb-4">
        <Field label={t('categorySettings.name')} htmlFor={`${id}-name`}>
          <input
            id={`${id}-name`}
            className={inputClass}
            autoFocus={!category}
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">{t('categorySettings.icon')}</legend>
          <div className="grid grid-cols-8 gap-1.5">
            {ICON_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                aria-pressed={choice === icon}
                aria-label={choice}
                onClick={() => setIcon(choice)}
                className={
                  'flex aspect-square items-center justify-center rounded-lg text-xl ring-1 ' +
                  (choice === icon ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'ring-slate-200 hover:bg-slate-50')
                }
              >
                {choice}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <ModalFooter>
        <ErrorBanner message={error} />
        <div className="flex justify-end">
          <button type="submit" className={`${primaryButtonClass} min-w-24`} disabled={saving}>
            {t('common.save')}
          </button>
        </div>
      </ModalFooter>
    </form>
  );
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ' +
        (checked ? 'bg-indigo-600' : 'bg-slate-300')
      }
    >
      <span
        className={
          'inline-block size-5 rounded-full bg-white shadow transition-transform ' +
          (checked ? 'translate-x-5.5' : 'translate-x-0.5')
        }
      />
    </button>
  );
}
