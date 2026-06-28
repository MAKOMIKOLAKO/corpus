'use client';

interface ShareEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: {
        id: string;
        title: string;
        authors: string[];
        url?: string | null;
    };
}

export default function ShareEntryModal({ isOpen, onClose, entry }: ShareEntryModalProps) {
    return null;
}
