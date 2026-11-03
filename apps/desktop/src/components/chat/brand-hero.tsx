import { cn } from '@/lib/utils'

/**
 * O robô do B-3PO no centro de uma conversa vazia — **um** tratamento, não dois.
 *
 * Duas telas mostravam o robô em tamanhos diferentes, uma com halo CSS e outra sem. A marca é uma só; a
 * apresentação também. Aqui ficam as medidas de referência (o plugin de bots é outro bundle e repete as
 * mesmas classes de propósito).
 *
 * A arte oficial (`public/b3po-hero.png`) já traz o anel de luz e um fade nas bordas — por isso não há halo
 * CSS em cima dela: dois brilhos no mesmo desenho parecem erro de montagem.
 */

const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

export const BRAND_HERO_SRC = assetPath('b3po-hero.png')
export const BRAND_HERO_ALT = 'B-3PO'

/** Arte larga da marca (16:9): limita por largura para não estourar em janela estreita. */
export const BRAND_HERO_BRAND =
  // `mix-blend-screen` no tema escuro dissolve o fundo preto da arte (preto não soma luz); no claro a
  // máscara alfa do PNG segura as bordas.
  'block h-auto w-[min(22rem,58vw)] object-contain dark:mix-blend-screen'

/** Mascote escolhido pelo bot: quadrado, mesmo teto de altura. */
export const BRAND_HERO_MASCOT = 'block h-[min(9rem,24vh)] w-auto rounded-[22%] object-contain'

type Variant = 'brand' | 'mascot'

/** Robô da marca, ou o mascote do bot, no mesmo enquadramento. */
export function BrandHero({
  alt,
  className,
  image,
  variant = 'brand'
}: {
  alt?: string
  className?: string
  image?: null | string
  variant?: Variant
}) {
  const src = variant === 'brand' ? BRAND_HERO_SRC : image || BRAND_HERO_SRC

  return (
    <span className={cn('mx-auto mb-4 flex items-center justify-center', className)}>
      <img alt={alt ?? (variant === 'brand' ? BRAND_HERO_ALT : '')} className={variant === 'brand' ? BRAND_HERO_BRAND : BRAND_HERO_MASCOT} src={src} />
    </span>
  )
}
