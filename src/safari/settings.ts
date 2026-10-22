// Safari 不向 iframe 注入脚本，依赖 iframe 脚本的功能必须关闭。
export function applySafariSettingsFixes(record: Record<string, any>) {
  record.openNotificationsPageAsDrawer = false
  record.showImmersiveModeEntry = false
  if (record.videoCardLinkOpenMode === 'drawer')
    record.videoCardLinkOpenMode = 'newTab'

  // 旧版 Safari 本地包曾关闭这些功能；迁移一次，恢复为可用的默认值。
  if (Number(record.safariRestoredFeatureProfileVersion ?? 0) < 1) {
    record.enableCommentReplyTreeDisplay = true
    const momentsDockItem = Array.isArray(record.dockItemsConfig)
      ? record.dockItemsConfig.find((item: any) => item?.page === 'Moments')
      : null
    if (momentsDockItem)
      momentsDockItem.useOriginalBiliPage = false
    record.safariRestoredFeatureProfileVersion = 1
  }

  const drawerMenuItem = Array.isArray(record.videoCardContextMenuConfig)
    ? record.videoCardContextMenuConfig.find((item: any) => item?.key === 'openInDrawer')
    : null
  if (drawerMenuItem?.visible)
    drawerMenuItem.visible = false
}
