import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Image Editor | AI Content Lab',
  description: 'Edit images using AI by drawing masks to specify areas to modify',
};

export default function EditImageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 