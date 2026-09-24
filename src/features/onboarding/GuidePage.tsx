import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

/** Everyday situations of a student abroad, and how to record each. */
const TOPICS = [
  { id: 'accounts', icon: '👛', to: '/accounts' },
  { id: 'record', icon: '✏️' },
  { id: 'foreignCard', icon: '💳' },
  { id: 'refund', icon: '🤝' },
  { id: 'transfer', icon: '🔁' },
  { id: 'monthly', icon: '📅' },
  { id: 'overview', icon: '📊', to: '/overview' },
  { id: 'search', icon: '🔎' },
  { id: 'backup', icon: '💾', to: '/settings' },
] as const;

export function GuidePage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{t('guide.title')}</h1>
        <p className="text-sm text-slate-600">{t('guide.intro')}</p>
      </div>
      <nav aria-label={t('guide.contents')} className="flex flex-wrap gap-2">
        {TOPICS.map((topic) => (
          <a
            key={topic.id}
            href={`#${topic.id}`}
            className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <span aria-hidden="true">{topic.icon}</span> {t(`guide.${topic.id}.title`)}
          </a>
        ))}
      </nav>
      {TOPICS.map((topic) => (
        <section
          key={topic.id}
          id={topic.id}
          aria-labelledby={`${topic.id}-title`}
          className="scroll-mt-20 space-y-2 rounded-xl bg-white p-4 ring-1 ring-slate-200"
        >
          <h2 id={`${topic.id}-title`} className="flex items-center gap-2 font-semibold">
            <span className="text-xl" aria-hidden="true">
              {topic.icon}
            </span>
            {t(`guide.${topic.id}.title`)}
          </h2>
          {t(`guide.${topic.id}.body`)
            .split('\n')
            .map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-slate-700">
                {paragraph}
              </p>
            ))}
          {'to' in topic && (
            <Link to={topic.to} className="inline-block text-sm font-medium text-indigo-700 hover:underline">
              {t(`guide.${topic.id}.link`)} →
            </Link>
          )}
        </section>
      ))}
    </div>
  );
}
