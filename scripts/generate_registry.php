<?php

/**
 * Mivo Plugin Registry Generator (Standalone)
 * 
 * This script fetches all repositories from the 'mivodev' organization,
 * looking for 'plugin-*' repositories. It generates:
 * 1. public/plugins.json
 * 2. public/releases.json
 */

// Configuration
$orgName = 'mivodev';
$outputDir = __DIR__ . '/../public';
if (!is_dir($outputDir)) mkdir($outputDir, 0755, true);

$pluginsFile = $outputDir . '/plugins.json';
$releasesFile = $outputDir . '/releases.json';
$githubToken = getenv('GITHUB_TOKEN');

function fetchUrl($url, $token = null) {
    $headers = [
        'User-Agent: Mivo-Registry-Bot'
    ];

    if (!empty($token)) {
        $headers[] = "Authorization: Bearer " . trim($token);
    }

    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $headers)
        ]
    ];
    $context = stream_context_create($opts);
    return file_get_contents($url, false, $context);
}

echo "Starting Registry Generation...\n";

// --- PART 1: PLUGINS ---

$reposUrl = "https://api.github.com/orgs/$orgName/repos?per_page=100";
$reposJson = fetchUrl($reposUrl, $githubToken);

if ($reposJson) {
    $repos = json_decode($reposJson, true);
    $plugins = [];

    foreach ($repos as $repo) {
        if (strpos($repo['name'], 'plugin-') !== 0) continue;

        echo "Processing Plugin: " . $repo['name'] . "\n";

        // Fetch Release Info
        $releaseUrl = "https://api.github.com/repos/$orgName/{$repo['name']}/releases/latest";
        $releaseJson = fetchUrl($releaseUrl, $githubToken);
        $release = $releaseJson ? json_decode($releaseJson, true) : null;

        // Fetch plugin.php
        $ref = $release ? $release['tag_name'] : $repo['default_branch'];
        $rawUrl = "https://raw.githubusercontent.com/$orgName/{$repo['name']}/{$ref}/plugin.php";
        $pluginContent = fetchUrl($rawUrl, $githubToken);

        if (!$pluginContent) {
            echo "  - Warning: plugin.php not found in $ref. Skipping.\n";
            continue;
        }

        // Parse Metadata
        preg_match_all('/^\s*\*\s*([a-zA-Z0-9 ]+):\s*(.+)$/m', $pluginContent, $matches, PREG_SET_ORDER);
        $metadata = [];
        foreach ($matches as $match) {
            $metadata[strtolower(trim($match[1]))] = trim($match[2]);
        }

        if (empty($metadata['plugin name'])) {
             echo "  - Warning: 'Plugin Name' header missing. Skipping.\n";
             continue;
        }
        
        // Determine Download
        $downloadUrl = $repo['html_url'] . '/archive/refs/heads/' . $repo['default_branch'] . '.zip';
        $version = '0.0.1';

        if ($release && !empty($release['assets'])) {
            $downloadUrl = $release['assets'][0]['browser_download_url'];
            $version = $release['tag_name'];
            echo "  > Using Release: $version\n";
        } else {
            echo "  > Using Branch: {$repo['default_branch']}\n";
        }

        // Construct Plugin
        $plugins[] = [
            'id' => $repo['name'],
            'name' => $metadata['plugin name'],
            'description' => $metadata['description'] ?? $repo['description'] ?? '',
            'author' => $metadata['author'] ?? $repo['owner']['login'],
            'version' => $metadata['version'] ?? $version,
            'category' => $metadata['category'] ?? 'Uncategorized',
            'tags' => array_filter(array_map('trim', explode(',', $metadata['tags'] ?? ''))),
            'repo' => $repo['html_url'],
            'download' => $downloadUrl,
            // Point to RAW README for client-side fetching
            'readme' => "https://raw.githubusercontent.com/$orgName/{$repo['name']}/{$ref}/README.md",
            'updated_at' => $repo['updated_at']
        ];
        echo "  + Added: " . $metadata['plugin name'] . "\n";
    }

    file_put_contents($pluginsFile, json_encode($plugins, JSON_UNESCAPED_SLASHES));
    echo "Saved " . count($plugins) . " plugins to plugins.json\n";
} else {
    echo "Error: Failed to fetch repositories.\n";
    exit(1);
}

// --- PART 2: RELEASES ---
echo "\nGenerating Mivo Release Archive...\n";
$mivoReleasesUrl = "https://api.github.com/repos/mivodev/mivo/releases?per_page=100";
$mivoReleasesJson = fetchUrl($mivoReleasesUrl, $githubToken);

if ($mivoReleasesJson) {
    $releasesRaw = json_decode($mivoReleasesJson, true);
    $archive = [];

    $latestFound = false;

    foreach ($releasesRaw as $release) {
        if ($release['draft']) continue;

        $assetUrl = $release['zipball_url'];
        $size = 0;
        
        foreach ($release['assets'] as $asset) {
            if ($asset['content_type'] === 'application/zip' || substr($asset['name'], -4) === '.zip') {
                $assetUrl = $asset['browser_download_url'];
                $size = $asset['size'];
                break;
            }
        }

        $isLatest = false;
        if (!$latestFound && !$release['prerelease']) {
            $isLatest = true;
            $latestFound = true;
        }

        $archive[] = [
            'version' => $release['tag_name'],
            'date' => date('Y-m-d', strtotime($release['published_at'])),
            'size' => $size,
            'download' => $assetUrl,
            'notes' => $release['html_url'],
            'prerelease' => $release['prerelease'],
            'latest' => $isLatest
        ];
    }

    file_put_contents($releasesFile, json_encode($archive, JSON_UNESCAPED_SLASHES));
    echo "Saved " . count($archive) . " releases to releases.json\n";
} else {
    echo "Warning: Failed to fetch Mivo releases.\n";
}
