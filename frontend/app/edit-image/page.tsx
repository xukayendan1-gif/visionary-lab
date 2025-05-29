"use client";

import React from 'react';
import EditorContainer from './components/EditorContainer';
import { PageHeader } from '@/components/page-header';
import { FadeScaleTransition } from '@/components/ui/page-transition';

export default function EditImagePage() {
  return (
    <FadeScaleTransition>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader 
          title="Edit"
        />
        
        <EditorContainer />
      </div>
    </FadeScaleTransition>
  );
} 