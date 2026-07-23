import { useResilientImage } from '../hooks/useResilientImage'

function RetryingImage({
  alt = '',
  decoding = 'async',
  fallbackSrc,
  fetchPriority = 'auto',
  loading = 'lazy',
  onError,
  onLoad,
  retries,
  retryDelay,
  src,
  ...props
}) {
  const image = useResilientImage(src, { fallbackSrc, retries, retryDelay })
  return (
    <img
      {...props}
      alt={alt}
      data-image-status={image.status}
      decoding={decoding}
      fetchPriority={fetchPriority}
      loading={loading}
      onError={(event) => {
        image.handleError()
        onError?.(event)
      }}
      onLoad={(event) => {
        image.handleLoad()
        onLoad?.(event)
      }}
      src={image.resolvedSrc}
    />
  )
}

export function ResilientImage(props) {
  return <RetryingImage key={props.src} {...props} />
}
