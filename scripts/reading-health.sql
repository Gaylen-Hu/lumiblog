-- Run with psql -X -v ON_ERROR_STOP=1 -v hours=24 -d myblog_db -f scripts/reading-health.sql
\if :{?hours}
\else
\set hours 24
\endif
BEGIN READ ONLY;
SET LOCAL statement_timeout = '20s';
WITH metrics AS (
  SELECT e."eventName" AS metric, e."sessionId", s.device, s.browser,
    substring(e."urlQuery" from 'network=(slow-2g|2g|3g|4g|unknown)$') AS network,
    substring(e."urlQuery" from '^value=([0-9]{1,12}(?:\.[0-9]{1,3})?)&')::double precision AS value
  FROM analytics_events e JOIN analytics_sessions s ON s.id=e."sessionId"
  WHERE e."createdAt" >= now() - (:'hours'::int * interval '1 hour')
    AND e."eventType" = 'custom'
    AND e."eventName" IN ('LCP','INP','CLS','route_ms','route_heap_mb','room_fps','room_draw_calls',
      'room_slow_frame_pct','room_init','room_init_error','webgl_context_lost','room_asset_4xx',
      'room_asset_5xx','room_asset_error','js_error','unhandled_rejection','article_visible_ms',
      'article_depth_pct','article_complete')
)
SELECT metric, device, browser, network, count(*) AS samples,
  round((percentile_cont(0.75) WITHIN GROUP (ORDER BY value))::numeric,3) AS p75,
  round((percentile_cont(0.95) WITHIN GROUP (ORDER BY value))::numeric,3) AS p95
FROM metrics WHERE value IS NOT NULL
GROUP BY metric, device, browser, network ORDER BY metric, samples DESC;
SELECT count(*) FILTER (WHERE "eventType"='pageview') AS article_views,
       count(*) FILTER (WHERE "eventName"='article_complete') AS completed_reads,
       round(100.0 * count(*) FILTER (WHERE "eventName"='article_complete')
         / nullif(count(*) FILTER (WHERE "eventType"='pageview'),0),1) AS completion_pct
FROM analytics_events
WHERE "createdAt" >= now() - (:'hours'::int * interval '1 hour') AND "urlPath" ~ '^/(zh|en)/posts/[^/]+/?$';
COMMIT;
