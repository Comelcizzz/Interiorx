import { useState } from 'react'
import { mediaUrl } from '@/lib/api'

export function PublicImage({
	src,
	fallback,
	alt,
	className,
}: {
	src?: string | null
	fallback: string
	alt: string
	className?: string
}) {
	const [failed, setFailed] = useState(false)
	const resolved = failed || !src ? fallback : mediaUrl(src)

	return (
		<img
			src={resolved}
			alt={alt}
			className={className}
			loading="lazy"
			onError={() => setFailed(true)}
			onLoad={(event) => {
				if (!failed && src && event.currentTarget.naturalWidth === 0) setFailed(true)
			}}
		/>
	)
}

