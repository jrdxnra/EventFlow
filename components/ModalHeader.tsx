'use client';

import ModalButton from './ModalButton';

interface ModalHeaderProps {
  title: string;
  subtitle: string;
  eventId: string;
  onDelete: () => void;
  onSave: () => void;
  onClose: () => void;
  deleteLabel?: string;
  deleteTitle?: string;
}

export default function ModalHeader({
  title,
  subtitle,
  eventId,
  onDelete,
  onSave,
  onClose,
  deleteLabel = "Delete",
  deleteTitle = "Delete Event"
}: ModalHeaderProps) {
  return (
    <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
      <div className="flex items-center justify-between p-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-2">
          <ModalButton
            variant="delete"
            onClick={onDelete}
            title={deleteTitle}
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            {deleteLabel}
          </ModalButton>
          
          <ModalButton
            variant="logistics"
            href={`/logistics?eventId=${eventId}`}
            title="View Logistics"
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          >
            Logistics
          </ModalButton>
          
          <ModalButton
            variant="save"
            onClick={onSave}
            title="Save Changes"
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
          >
            Save
          </ModalButton>
          
          <div className="w-2"></div>
          
          <ModalButton
            variant="close"
            onClick={onClose}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
          >
            Close
          </ModalButton>
        </div>
      </div>
    </div>
  );
}