'use client'

import { useEffect } from 'react'

import { useDiscussionRuntime } from '@/features/discussions/runtime'

import {
  FOCUS_ANNOTATION_EVENT,
  revealAnnotationsPane,
} from '../annotation-events'
import { applyAnnotationHighlights } from './apply-annotation-marks'
import { groupAnnotationLoci } from './group-annotation-loci'
import styles from './annotation-highlights.module.css'

export function AnnotationHighlights() {
  const { ready, revision, threads } = useDiscussionRuntime()

  useEffect(() => {
    if (!ready) return
    const article = document.querySelector('[data-reader-article]')
    if (!article) return
    const loci = groupAnnotationLoci(threads.map((view) => view.thread))
    const cleanup = applyAnnotationHighlights(article, loci)
    article.setAttribute('data-annotation-highlights', 'ready')

    const onClick = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const mark = target.closest('mark.anno')
      if (!mark || !article.contains(mark)) return
      const locusId = mark.getAttribute('data-anno')
      if (!locusId) return
      revealAnnotationsPane()
      window.dispatchEvent(new CustomEvent(FOCUS_ANNOTATION_EVENT, { detail: locusId }))
    }

    article.addEventListener('click', onClick)
    return () => {
      article.removeEventListener('click', onClick)
      article.removeAttribute('data-annotation-highlights')
      cleanup()
    }
  }, [ready, revision, threads])

  return <span aria-hidden="true" className={styles.bridge} hidden />
}
