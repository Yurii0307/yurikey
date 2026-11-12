(function initMockKSU() {
  if (typeof window.ksu !== "undefined") {
    console.info("[Dev] Native ksu object already present.");
    return;
  }

  console.log(
    "%c[Yurikey Dev]%c Mock KernelSU Bridge Active",
    "background: #00497d; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
    "color: #9ecaff; font-weight: bold;"
  );

  const liveMockProperties = [
  {
    "name": "persist.sys.fuse",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.vendor.mte_launcher.enable_mte",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.enable_pv",
    "value": "12 0 0",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.hyperceiler.log.level",
    "value": "debug",
    "disabled": true
  },
  {
    "name": "persist.vendor.qfp.enable_intr2",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.enable_fd",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.enable_td",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.enable_ntz",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.fd_events_src",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.tz_srv_name",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.tz_dev_name",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.vfs_info",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.bluetooth.a2dp_offload.cap",
    "value": "sbc-aac-aptx-aptxhd-ldac-opus",
    "disabled": false
  },
  {
    "name": "persist.bluetooth.opus.enabled",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.bluetooth.a2dp_ldac.default_quality_mode",
    "value": "3",
    "disabled": false
  },
  {
    "name": "persist.vendor.nfc.antenna.am_value",
    "value": "2124",
    "disabled": false
  },
  {
    "name": "persist.vendor.nfc.antenna.i_value",
    "value": "260",
    "disabled": false
  },
  {
    "name": "persist.vendor.nfc.antenna.se1_value",
    "value": "855",
    "disabled": false
  },
  {
    "name": "persist.vendor.nfc.antenna.se2_value",
    "value": "886",
    "disabled": false
  },
  {
    "name": "persist.vendor.nfc.antenna.timestamp",
    "value": "2026-11-12 12:00:00",
    "disabled": false
  },
  {
    "name": "persist.vendor.se.reset",
    "value": "noneed",
    "disabled": false
  },
  {
    "name": "persist.sys.boot.reason.history",
    "value": "reboot,,1700000000\nreboot,,1699900000",
    "disabled": false
  },
  {
    "name": "persist.sys.boot.reason",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.vendor.sys.modem.logging.enable",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.vendor.modem.efs.clear.action",
    "value": "none",
    "disabled": false
  },
  {
    "name": "persist.device_config.attempted_boot_count",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.vendor.radio.target_oper",
    "value": "400",
    "disabled": false
  },
  {
    "name": "persist.radio.uim.remote.mcc",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.radio.uim.remote.slot",
    "value": "-1",
    "disabled": false
  },
  {
    "name": "persist.sys.timezone",
    "value": "America/New_York",
    "disabled": false
  },
  {
    "name": "persist.sys.dalvik.vm.lib.2",
    "value": "libart.so",
    "disabled": false
  },
  {
    "name": "persist.bluetooth.disable.accelerate.bt.on",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.vendor.modem.baseband.version",
    "value": "g5400c-260604-260807-B-16035863",
    "disabled": false
  },
  {
    "name": "persist.sys.theme",
    "value": "2",
    "disabled": false
  },
  {
    "name": "persist.sys.displayinset.top",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.sys.lmk.reportkills",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.vendor.radio.cp.hw.version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.vendor.radio.dds",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.bootanim.color1",
    "value": "-2442010",
    "disabled": false
  },
  {
    "name": "persist.bootanim.color2",
    "value": "-5862735",
    "disabled": false
  },
  {
    "name": "persist.bootanim.color3",
    "value": "-9756",
    "disabled": false
  },
  {
    "name": "persist.bootanim.color4",
    "value": "-2052",
    "disabled": false
  },
  {
    "name": "persist.vendor.ril.sim2.oc_name_id",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.sys.timezone_confidence",
    "value": "100",
    "disabled": false
  },
  {
    "name": "persist.vendor.primarydisplay.op.peak_refresh_rate",
    "value": "120",
    "disabled": false
  },
  {
    "name": "persist.vendor.se.osversion",
    "value": "060C2B060104012A026E010301000607D0026A15E00102,00020000,443136303938353942",
    "disabled": false
  },
  {
    "name": "persist.vendor.se.dkaversion",
    "value": "0302000600",
    "disabled": false
  },
  {
    "name": "persist.sys.gps.lpp",
    "value": "2",
    "disabled": false
  },
  {
    "name": "persist.vendor.se.susaversion",
    "value": "0103000500",
    "disabled": false
  },
  {
    "name": "persist.radio.is_vonr_enabled_1",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.vendor.radio.call_waiting_for_sync_1",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.radio.csc.clir_aoc_1",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.sys.ssr.last_detection_time",
    "value": "1700000000000",
    "disabled": false
  },
  {
    "name": "persist.adb.tradeinmode",
    "value": "-1",
    "disabled": false
  },
  {
    "name": "persist.sys.usb.config",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ipclient_dhcpv6_prefix_delegation_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.dhcp_slow_retransmission_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.data_stall_consecutive_dns_timeout_threshold",
    "value": "5",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.dhcp_init_reboot_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ip_reachability_ignore_nud_failure_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.networkmonitor_async_privdns_resolution",
    "value": "341810040",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ipclient_garp_na_roaming_version",
    "value": "302100101",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ipclient_dual_stack_max_dtim_multiplier",
    "value": "2",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ipclient_replace_netd_with_netlink_version",
    "value": "360500000",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ip_reachability_ignore_incompleted_ipv6_dns_server_version",
    "value": "331710000",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ipclient_gratuitous_na_version",
    "value": "331313010",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.dhcp_ipv6_only_preferred_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ip_reachability_mcast_resolicit_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ipclient_multicast_ns_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.reevaluate_when_resume",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.apf_handle_nd_offload",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.netstats_fastdatainput_target_attempts",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ipclient_accept_ipv6_link_local_dns_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.dhcp_ip_conflict_detect_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.apf_new_ra_filter_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ip_reachability_router_mac_change_failure_only_after_roam_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ipclient_ipv6_only_max_dtim_multiplier",
    "value": "2",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.dhcp_init_reboot_enabled",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.dhcp_server_decline_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ip_reachability_ignore_incompleted_ipv6_default_router_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.apf_handle_arp_offload_force_disable",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.dhcp_rapid_commit_enabled",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.ip_reachability_ignore_never_reachable_neighbor_version",
    "value": "350820280",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.dhcp_rapid_commit_version",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.dns_ddr_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.dhcp_restart_configuration_delay",
    "value": "1000",
    "disabled": false
  },
  {
    "name": "persist.device_config.connectivity.apf_polling_counters_version",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.metrics.reporting-num-mods",
    "value": "100",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.metrics.write-to-statsd",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.usap_pool_refill_delay_ms",
    "value": "3000",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.metrics.reporting-mods",
    "value": "2",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.usap_pool_size_max",
    "value": "10",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.metrics.reporting-spec",
    "value": "1,5,30,60,600",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.metrics.reporting-spec-server",
    "value": "1,10,60,3600,*",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.metrics.reporting-num-mods-server",
    "value": "100",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.usap_refill_threshold",
    "value": "5",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.pin_shared_anon_size",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.usap_pool_size_min",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.usap_pool_enabled",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.use_app_image_startup_cache",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native.metrics.reporting-mods-server",
    "value": "2",
    "disabled": false
  },
  {
    "name": "persist.device_config.nnapi_native.current_feature_level",
    "value": "7",
    "disabled": false
  },
  {
    "name": "persist.device_config.nnapi_native.telemetry_enable",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.vendor.pulsar.opt_out",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.smart_idle_maint_period",
    "value": "60",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.take_over_get_content",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.fuse_enabled",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.target_dirty_ratio",
    "value": "80",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.dirty_reclaim_rate",
    "value": "0.5",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.transcode_compat_stale",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.low_battery_level",
    "value": "20.0",
    "disabled": false
  },
  {
    "name": "persist.device_config.surface_flinger_native_boot.SkiaTracingFeature__use_skia_tracing",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.lifetime_threshold",
    "value": "70",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.smart_idle_maint_enabled",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.min_gc_sleeptime",
    "value": "5000",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.segment_reclaim_weight",
    "value": "2.0",
    "disabled": false
  },
  {
    "name": "persist.device_config.activity_manager_native_boot.modern_queue_enabled",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.charging_required",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.storage_native_boot.min_segments_threshold",
    "value": "512",
    "disabled": false
  },
  {
    "name": "persist.device_config.memory_management_native_boot.MemoryGuardianKillSwitch__memory_guardian_kill_switch",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native_boot.force_disable_uffd_gc",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native_boot.pin_camera",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native_boot.use_generational_gc",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.device_config.input_native_boot.slow_event_min_reporting_latency_millis",
    "value": "200",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native_boot.mode_override",
    "value": "default",
    "disabled": false
  },
  {
    "name": "persist.device_config.vendor_system_native_boot.boost_adpf_prio",
    "value": "-1",
    "disabled": false
  },
  {
    "name": "persist.device_config.input_native_boot.slow_event_min_reporting_interval_millis",
    "value": "60000",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native_boot.iorapd_options",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.device_config.input_native_boot.velocitytracker_strategy",
    "value": "lsq2",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native_boot.iorap_perfetto_enable",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native_boot.iorap_readahead_enable",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native_boot.iorap_blacklisted_packages",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native_boot.disable_lock_profiling",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.runtime_native_boot.bootloader_override",
    "value": "default",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.dot_connect_timeout_ms",
    "value": "30000",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.parallel_lookup",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.dot_query_timeout_ms",
    "value": "-1",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.doh_early_data",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.dot_async_handshake",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.doh_session_resumption",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.sort_nameservers",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.max_queries_global",
    "value": "2500",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.max_cache_entries",
    "value": "640",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.dns_event_subsample_map",
    "value": "default:6 0:400 2:110 4:110 7:110",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.dot_revalidation_threshold",
    "value": "-1",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.no_retry_after_cancel",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.dot_validation_latency_offset_ms",
    "value": "100",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.dot_xport_unusable_threshold",
    "value": "-1",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.retry_count",
    "value": "2",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.keep_listening_udp",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.retransmission_time_interval",
    "value": "3000",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.doh",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.parallel_lookup_sleep_time",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.dot_validation_latency_factor",
    "value": "3",
    "disabled": false
  },
  {
    "name": "persist.device_config.netd_native.dot_maxtries",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.device_config.edgetpu_native.allowlist_app5",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.device_config.edgetpu_native.allowlist_app12",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.device_config.edgetpu_native.allowlist_app6",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.device_config.edgetpu_native.allowlist_app11",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.device_config.edgetpu_native.allowlist_app7",
    "value": "",
    "disabled": false
  },
  {
    "name": "persist.device_config.pixel_faceauth.faceauth_noop_flag",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.pixel_faceauth.experimental_pipeline_input_flag",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.lmkd_native.thrashing_limit_critical",
    "value": "300",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_enable",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_judder_score_histogram_buckets",
    "value": "0,4,5,9,11,20,30,40,50,60,70,80",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_trace_minimum_freeze_duration_ms",
    "value": "400",
    "disabled": false
  },
  {
    "name": "persist.device_config.mglru_native.lru_gen_config",
    "value": "all",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_freeze_duration_ms_histogram_buckets",
    "value": "0,20,40,60,80,100,120,150,175,225,300,400,500",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_freeze_event_details_max",
    "value": "20",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_live_content_frame_drop_tolerance_us",
    "value": "200000",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_freeze_duration_ms_histogram_to_score",
    "value": "1,1,50,50,100,100,100,100,100,100,250,250,500",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_trace_trigger_throttle_ms",
    "value": "300000",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_trace_maximum_freeze_duration_ms",
    "value": "1500",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_judder_score_histogram_to_score",
    "value": "1,1,1,1,1,1,1,1,1,1,1,1",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_frame_detection_tolerance_us",
    "value": "2000",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_freeze_event_distance_ms_max",
    "value": "60000",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_freeze_distance_ms_histogram_buckets",
    "value": "0,20,100,400,1000,2000,3000,4000,8000,15000,30000,60000",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_judder_event_max",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_trace_trigger_enabled",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_judder_event_details_max",
    "value": "20",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_freeze_event_max",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_max_expected_content_frame_duration_us",
    "value": "400000",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_enabled",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_are_skipped_frames_dropped",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_judder_event_distance_ms_max",
    "value": "5000",
    "disabled": false
  },
  {
    "name": "persist.device_config.media_native.render_metrics_judder_error_tolerance_us",
    "value": "2000",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.enable_graph_caching",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.maintenance_task_zram_writeback",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.enable_ml_saliency_init_priority_high_flag",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.camera_noop_enum_flag",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.decrement_max_hal_buffer_1080p60fps_flag",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.blur_refinement_video_10bit_hdr_flag",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.maintenance_task_scheduler",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.face_auth_graph_caching",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.enable_ml_saliency_init_at_boot_flag",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.graph_runner_rt_wake_threshold",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.pa_kill_during_launch_flag",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.graph_runner_nonrt_wake_threshold",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.setting_effective_frame_override_margin_ms_flag",
    "value": "-1",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.camera_noop_flag",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.default_lwis_allocator",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.apply_async_sensor_power_down",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.isp_fe_async_programming_flag",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.decrement_max_hal_buffer_1080p30fps_flag",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.pinned_memory_setting_flag",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.camera_native.smra_config_v2",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.device_config.remote_key_provisioning_native.enable_rkpd",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.configuration.ConfigInfraFlags__enable_unattended_reboot",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.configuration.rescue_party_throttle_duration_min",
    "value": "10",
    "disabled": false
  },
  {
    "name": "persist.device_config.configuration.flag",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.device_config.configuration.flag_four",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.configuration.flag_five",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.configuration.flag_six",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.configuration.flag_three",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.configuration.flag_two",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.device_config.configuration.ConfigInfraFlags__enable_boot_notification",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.vendor.audio.cca.control.from.audiomanager.disabled",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.vendor.audio.cca.enabled",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.cbge_info_0",
    "value": "31:1700000000000",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.cbge_info_1",
    "value": "38:1700000000000",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.cbge_info_2",
    "value": "36:1700000000000",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.cbge_info_3",
    "value": "27:1700000000000",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.cbge_info_4",
    "value": "28:1700000000000",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.cbge_info_5",
    "value": "19:1700000000000",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.cbge_info_6",
    "value": "35:1700000000000",
    "disabled": false
  },
  {
    "name": "persist.vendor.qfp.cbge_info_7",
    "value": "25:1700000000000",
    "disabled": false
  },
  {
    "name": "persist.sys.device_provisioned",
    "value": "1",
    "disabled": false
  },
  {
    "name": "persist.sys.sf.color_saturation",
    "value": "1.0",
    "disabled": false
  },
  {
    "name": "persist.sys.sf.native_mode",
    "value": "2",
    "disabled": false
  },
  {
    "name": "persist.zygote.zygote_next.start_on_boot",
    "value": "true",
    "disabled": false
  },
  {
    "name": "persist.vendor.ril.sim1.oc_name_id",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.vendor.radio.call_waiting_for_sync_0",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.radio.is_vonr_enabled_0",
    "value": "false",
    "disabled": false
  },
  {
    "name": "persist.radio.csc.clir_aoc_0",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.pixelsuite.superdark",
    "value": "0",
    "disabled": false
  },
  {
    "name": "persist.vendor.min_gcma_dmabuf_kb",
    "value": "512",
    "disabled": false
  },
  {
    "name": "persist.radio.call.audio.output",
    "value": "0",
    "disabled": false
  }
];

  const mockDisabledProps = new Map();
  let mockProperties = [];

  function refreshMockProperties() {
    const out = liveMockProperties.map(p => ({ name: p.name, value: p.value, disabled: false }));
    for (const [name, value] of mockDisabledProps) {
      out.push({ name, value, disabled: true });
    }
    mockProperties = out;
    window.mockPersistentProperties = mockProperties;
    return mockProperties;
  }

  function tokenizeCommand(cmd) {
    const tokens = [];
    let cur = "";
    let quote = null;
    for (let i = 0; i < cmd.length; i++) {
      const ch = cmd[i];
      if (quote) {
        if (ch === quote) quote = null;
        else cur += ch;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === "\\") {
        i += 1;
        if (i < cmd.length) cur += cmd[i];
      } else if (/\s/.test(ch)) {
        if (cur) {
          tokens.push(cur);
          cur = "";
        }
      } else {
        cur += ch;
      }
    }
    if (cur) tokens.push(cur);
    return tokens;
  }

  refreshMockProperties();

  window.ksu = {
    exec: function (command, env, callbackId) {
      console.log(
        "%c[ksu.exec]%c " + command,
        "color: #9ecaff; font-weight: bold;",
        "color: inherit;"
      );

      setTimeout(() => {
        let stdout = "";
        let stderr = "";
        let code = 0;

        const tokens = tokenizeCommand(command);
        const isScript = (token, file) => token === file || token.endsWith("/" + file);
        const scriptIndex = tokens.findIndex(t => isScript(t, "persist_props.sh"));

        if (scriptIndex !== -1) {
          const action = tokens[scriptIndex + 1] || "";
          const name = tokens[scriptIndex + 2];
          const value = tokens[scriptIndex + 3];

          if (action === "list") {
            refreshMockProperties();
            stdout = JSON.stringify(mockProperties);
          } else if (action === "set") {
            const newValue = value === undefined ? "" : value;
            mockDisabledProps.delete(name);
            const existing = liveMockProperties.find(p => p.name === name);
            if (existing) {
              existing.value = newValue;
            } else {
              liveMockProperties.unshift({ name, value: newValue, disabled: false });
            }
            refreshMockProperties();
            stdout = '{"success": true}';
          } else if (action === "disable") {
            const idx = liveMockProperties.findIndex(p => p.name === name);
            if (idx !== -1) {
              mockDisabledProps.set(name, liveMockProperties.splice(idx, 1)[0].value);
            }
            refreshMockProperties();
            stdout = '{"success": true}';
          } else if (action === "enable") {
            if (mockDisabledProps.has(name)) {
              liveMockProperties.unshift({ name, value: mockDisabledProps.get(name), disabled: false });
              mockDisabledProps.delete(name);
            }
            refreshMockProperties();
            stdout = '{"success": true}';
          } else if (action === "delete") {
            mockDisabledProps.delete(name);
            for (let i = liveMockProperties.length - 1; i >= 0; i--) {
              if (liveMockProperties[i].name === name) liveMockProperties.splice(i, 1);
            }
            refreshMockProperties();
            stdout = '{"success": true}';
          } else {
            stdout = '{"success": true}';
          }
        } else if (tokens.some(t => isScript(t, "module.prop"))) {
          stdout = "v2.5 (Dev)";
        } else if (tokens.some(t => isScript(t, "device-info.sh"))) {
          stdout = "Mock: device-info.sh executed successfully";
        } else {
          stdout = `[Mock] Successfully completed: ${command}`;
        }

        const callback = window[callbackId];
        if (typeof callback === "function") {
          if (callback.length <= 1) {
            callback(stdout);
          } else {
            callback(code, stdout, stderr);
          }
        }
      }, 120);
    },
  };
})();
