'use client'

import type { CSSProperties } from 'react'
import { JOURNEY_CONTENT } from '../content'
import { seededUnit } from '../motion/math'
import type { TypographyLayout } from '../motion/pretext-layout'

type JourneyTypeLayerProps = {
  layout: TypographyLayout
}
const RUNE_GLYPHS = ['玄', '卜', '川', '山', '彡', '乚', '爻', '无'] as const
const STROKE_GLYPHS = ['丶', '丿', '丨', '乚', '羽', '升'] as const

function calcLeft(x: number) {
  return `calc(50% + ${x.toFixed(2)}px)`
}

export function JourneyTypeLayer({ layout }: JourneyTypeLayerProps) {
  const titleFragments = Array.from({ length: 64 }, (_, index) => {
    const glyph = layout.title[index % layout.title.length]
    const sourceX = glyph?.x ?? 0
    const sourceWidth = glyph?.width ?? layout.styles.title.fontSize
    const scatterAngle = seededUnit(20260815, index, 'scatter-angle') * Math.PI * 2
    const scatterRadius = 140 + seededUnit(20260815, index, 'scatter-radius') * 430
    const swirlAngle = (index / 64) * Math.PI * 2.8
    const swirlRadius = 95 + (index % 9) * 14

    return {
      id: `title-fragment-${index}`,
      char: STROKE_GLYPHS[index % STROKE_GLYPHS.length],
      homeX:
        sourceX +
        (seededUnit(20260815, index, 'home-x') - 0.5) * sourceWidth * 0.78,
      homeY:
        (seededUnit(20260815, index, 'home-y') - 0.5) *
        layout.styles.title.fontSize *
        0.68,
      scatterX: Math.cos(scatterAngle) * scatterRadius,
      scatterY: Math.sin(scatterAngle) * scatterRadius * 0.62,
      scatterRotation: -80 + seededUnit(20260815, index, 'rotation') * 160,
      swirlX: Math.cos(swirlAngle) * swirlRadius,
      swirlY: Math.sin(swirlAngle) * swirlRadius * 0.54,
    }
  })

  const coverTiles = Array.from({ length: 24 }, (_, index) => ({
    id: `cover-tile-${index}`,
    x: (seededUnit(20260815, index, 'tile-x') - 0.5) * 820,
    y: (seededUnit(20260815, index, 'tile-y') - 0.5) * 560,
    rotation: -28 + seededUnit(20260815, index, 'tile-rotation') * 56,
    exitX: (seededUnit(20260815, index, 'tile-exit-x') - 0.5) * 460,
    exitY: (seededUnit(20260815, index, 'tile-exit-y') - 0.5) * 320,
  }))

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div data-prologue-copy className="absolute inset-0">
        <div className="absolute inset-x-0 top-[33%] h-[30%]">
          {layout.title.map((glyph) => (
            <span
              key={glyph.id}
              data-title-glyph
              data-idle-wave-glyph
              data-idle-wave-index={glyph.index}
              data-motion-id={glyph.id}
              data-pretext-char={glyph.char}
              data-pretext-role="title"
              data-pretext-font-size={layout.styles.title.fontSize.toFixed(2)}
              data-pretext-font-weight={layout.styles.title.fontWeight}
              data-pretext-letter-spacing={layout.styles.title.letterSpacing.toFixed(2)}
              data-pretext-line-width={layout.styles.title.lineWidth.toFixed(2)}
              data-pretext-width={glyph.width.toFixed(2)}
              data-pretext-x={glyph.x.toFixed(2)}
              className="absolute top-0 -translate-x-1/2 text-center leading-none"
              style={{
                left: calcLeft(glyph.x),
                fontFamily: layout.styles.title.fontFamily,
                fontSize: layout.styles.title.fontSize,
                fontWeight: layout.styles.title.fontWeight,
                letterSpacing: 0,
                width: glyph.width,
              }}
            >
              <span
                data-idle-wave-visual
                className="journey-title-glyph block will-change-transform"
                style={{
                  transform:
                    'translate3d(0, var(--journey-idle-y, 0px), 0)',
                }}
              >
                {glyph.char}
              </span>
            </span>
          ))}
        </div>

        <div className="absolute inset-x-0 top-[57%] h-16">
          {layout.motto.map((glyph) => {
            const rune = RUNE_GLYPHS[glyph.index % RUNE_GLYPHS.length]
            const style = {
              left: calcLeft(glyph.x),
              width: glyph.width,
            } satisfies CSSProperties

            return (
              <span
                key={glyph.id}
                data-motto-glyph
                data-idle-wave-glyph
                data-idle-wave-index={glyph.index}
                data-motion-id={glyph.id}
                data-pretext-char={glyph.char}
                data-pretext-role="motto"
                data-pretext-font-size={layout.styles.motto.fontSize.toFixed(2)}
                data-pretext-font-weight={layout.styles.motto.fontWeight}
                data-pretext-letter-spacing={layout.styles.motto.letterSpacing.toFixed(2)}
                data-pretext-line-width={layout.styles.motto.lineWidth.toFixed(2)}
                data-pretext-width={glyph.width.toFixed(2)}
                data-pretext-x={glyph.x.toFixed(2)}
                data-scatter-x={(
                  (seededUnit(20260815, glyph.id, 'motto-x') - 0.5) *
                  720
                ).toFixed(2)}
                data-scatter-y={(
                  (seededUnit(20260815, glyph.id, 'motto-y') - 0.5) *
                  390
                ).toFixed(2)}
                data-scatter-rotation={(
                  -48 + seededUnit(20260815, glyph.id, 'motto-r') * 96
                ).toFixed(2)}
                className="absolute top-0 -translate-x-1/2 text-center"
                style={{
                  ...style,
                  fontFamily: layout.styles.motto.fontFamily,
                  fontSize: layout.styles.motto.fontSize,
                  fontWeight: layout.styles.motto.fontWeight,
                  letterSpacing: 0,
                  lineHeight: `${layout.styles.motto.lineHeight}px`,
                }}
              >
                <span
                  data-motion-resolved-glyph
                  className="journey-resolved-glyph absolute inset-0 will-change-transform"
                  style={{
                    transform:
                      'translate3d(0, var(--journey-idle-y, 0px), 0)',
                  }}
                >
                  {glyph.char === ' ' ? '\u00A0' : glyph.char}
                </span>
                <span
                  data-motion-cipher-glyph
                  className="journey-rune-glyph invisible absolute inset-0 opacity-0 will-change-transform"
                  style={{
                    transform:
                      'translate3d(0, var(--journey-idle-y, 0px), 0)',
                  }}
                >
                  {glyph.char === ' ' ? '·' : rune}
                </span>
              </span>
            )
          })}
        </div>
      </div>

      <div className="absolute inset-0">
        {titleFragments.map((fragment) => (
          <span
            key={fragment.id}
            data-title-fragment
            data-motion-id={fragment.id}
            data-scatter-x={fragment.scatterX.toFixed(2)}
            data-scatter-y={fragment.scatterY.toFixed(2)}
            data-scatter-rotation={fragment.scatterRotation.toFixed(2)}
            data-swirl-x={fragment.swirlX.toFixed(2)}
            data-swirl-y={fragment.swirlY.toFixed(2)}
            className="journey-title-fragment invisible absolute top-[43%] -translate-x-1/2 -translate-y-1/2 opacity-0"
            style={{
              fontFamily: layout.styles.title.fontFamily,
              left: calcLeft(fragment.homeX),
              marginTop: fragment.homeY,
              fontSize: `${16 + (fragment.id.length % 5) * 3}px`,
            }}
          >
            {fragment.char}
          </span>
        ))}
      </div>

      <div
        data-motion-cover-field
        className="absolute inset-0 grid grid-cols-6 grid-rows-4"
      >
        {coverTiles.map((tile) => (
          <span
            key={tile.id}
            data-motion-tile
            data-motion-id={tile.id}
            data-entry-x={tile.x.toFixed(2)}
            data-entry-y={tile.y.toFixed(2)}
            data-entry-rotation={tile.rotation.toFixed(2)}
            data-exit-x={tile.exitX.toFixed(2)}
            data-exit-y={tile.exitY.toFixed(2)}
            className="journey-cover-tile invisible block h-full w-full opacity-0"
          />
        ))}
      </div>

      <div
        data-book-title
        className="journey-book-title invisible absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[clamp(2.1rem,4.4vw,4.4rem)] tracking-[0.34em] opacity-0 [writing-mode:vertical-rl]"
      >
        {JOURNEY_CONTENT.bookTitle}
      </div>

      <div className="absolute inset-0">
        {layout.floating.map((glyph) => (
          <span
            key={glyph.id}
            data-open-glyph
            data-motion-id={glyph.id}
            data-pretext-char={glyph.char}
            data-pretext-role="floating"
            data-pretext-font-size={layout.styles.floating.fontSize.toFixed(2)}
            data-pretext-font-weight={layout.styles.floating.fontWeight}
            data-pretext-letter-spacing={layout.styles.floating.letterSpacing.toFixed(2)}
            data-pretext-line-width={layout.styles.floating.lineWidth.toFixed(2)}
            data-pretext-width={glyph.width.toFixed(2)}
            data-pretext-x={glyph.x.toFixed(2)}
            data-float-x={(
              (seededUnit(20260815, glyph.id, 'float-x') - 0.5) * 760 -
              glyph.x
            ).toFixed(2)}
            data-float-y={(
              -80 - seededUnit(20260815, glyph.id, 'float-y') * 240
            ).toFixed(2)}
            data-rain-y={(
              260 + seededUnit(20260815, glyph.id, 'rain-y') * 430
            ).toFixed(2)}
            className="journey-floating-glyph invisible absolute top-[58%] -translate-x-1/2 -translate-y-1/2 opacity-0"
            style={{
              fontFamily: layout.styles.floating.fontFamily,
              fontSize: layout.styles.floating.fontSize,
              fontWeight: layout.styles.floating.fontWeight,
              letterSpacing: 0,
              left: calcLeft(glyph.x),
              lineHeight: `${layout.styles.floating.lineHeight}px`,
              width: glyph.width,
            }}
          >
            {glyph.char}
          </span>
        ))}
      </div>

      <p
        data-narrative-line
        className="invisible absolute inset-x-0 top-[24%] m-0 h-16 opacity-0"
      >
        {layout.narrative.map((glyph) => (
          <span
            key={glyph.id}
            data-narrative-glyph
            data-motion-id={glyph.id}
            data-pretext-char={glyph.char}
            data-pretext-role="narrative"
            data-pretext-font-size={layout.styles.narrative.fontSize.toFixed(2)}
            data-pretext-font-weight={layout.styles.narrative.fontWeight}
            data-pretext-letter-spacing={layout.styles.narrative.letterSpacing.toFixed(2)}
            data-pretext-line-width={layout.styles.narrative.lineWidth.toFixed(2)}
            data-pretext-width={glyph.width.toFixed(2)}
            data-pretext-x={glyph.x.toFixed(2)}
            className="absolute top-0 -translate-x-1/2 text-center"
            style={{
              fontFamily: layout.styles.narrative.fontFamily,
              fontSize: layout.styles.narrative.fontSize,
              fontWeight: layout.styles.narrative.fontWeight,
              letterSpacing: 0,
              left: calcLeft(glyph.x),
              lineHeight: `${layout.styles.narrative.lineHeight}px`,
              width: glyph.width,
            }}
          >
            {glyph.char}
          </span>
        ))}
      </p>

      <p
        data-gate-line
        className="journey-gate-line invisible absolute inset-x-6 top-[25%] m-0 text-center font-serif text-[clamp(1.45rem,3vw,3rem)] tracking-[0.28em] opacity-0"
      >
        {JOURNEY_CONTENT.gateLine}
      </p>
    </div>
  )
}
