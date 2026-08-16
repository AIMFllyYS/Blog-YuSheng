import 'server-only'

// Compatibility export for callers created before the Canonical IR collector
// landed. Asset discovery itself now has exactly one parser and registry path.
export {
  collectAssetReferences as collectTemporaryAssetReferences,
  type AssetReference as TemporaryAssetReference,
} from './collect-asset-references'
