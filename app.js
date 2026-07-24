<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>寻亲风云录 - 文字RPG</title>
    <style>
        /* 基础样式 */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Microsoft YaHei', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #1a1a2e;
            color: #eee;
        }
        h1 {
            text-align: center;
            color: #ffd700;
            margin-bottom: 20px;
            text-shadow: 0 0 10px rgba(255,215,0,0.3);
        }
        #game-container {
            background: #16213e;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        #player-info {
            background: #0f3460;
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
        }
        #scene-container {
            background: #0f3460;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            min-height: 100px;
        }
        #combat-container {
            background: #0a0a2a;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            display: none;
            min-height: 150px;
        }
        #action-buttons {
            display: none;
            gap: 10px;
            margin: 10px 0;
            flex-wrap: wrap;
        }
        #combat-log {
            background: #0a0a1a;
            padding: 10px;
            border-radius: 5px;
            max-height: 150px;
            overflow-y: auto;
            margin: 10px 0;
            font-size: 13px;
            border: 1px solid #1a2a4a;
        }
        #combat-result {
            padding: 15px;
            text-align: center;
            font-size: 24px;
            border-radius: 10px;
            margin: 10px 0;
            display: none;
        }
        .enemy-container, .player-container {
            margin-bottom: 15px;
        }
        .enemy-container h3, .player-container h3 {
            color: #aaa;
            font-size: 14px;
            margin-bottom: 8px;
        }
        .enemy-unit, .player-unit {
            background: #1a1a40;
            padding: 10px 15px;
            margin: 5px 0;
            border-radius: 5px;
            border: 2px solid transparent;
            cursor: pointer;
            transition: all 0.3s;
        }
        .enemy-unit:hover:not(.dead) {
            background: #2a2a55;
        }
        .enemy-unit.selected {
            border-color: #ffd700;
            background: #2a2a50;
            box-shadow: 0 0 15px rgba(255,215,0,0.2);
        }
        .enemy-unit.dead {
            opacity: 0.4;
            border-color: #444;
            cursor: default;
        }
        .dead-label {
            color: #ff4444;
            font-weight: bold;
            margin-left: 10px;
        }
        .enemy-name, .player-name {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 5px;
        }
        .hp-bar {
            background: #333;
            height: 8px;
            border-radius: 4px;
            margin-top: 3px;
            overflow: hidden;
        }
        .hp-fill {
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 4px;
        }
        .hp-text {
            font-size: 14px;
        }
        .player-stats span {
            margin-right: 15px;
            font-size: 12px;
            color: #aaa;
        }
        .action-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            background: #e94560;
            color: #fff;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
            flex: 1;
            min-width: 80px;
        }
        .action-btn:hover:not(:disabled) {
            transform: scale(1.05);
            background: #ff6b81;
        }
        .action-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none;
        }
        .log-container p {
            margin: 2px 0;
            padding: 2px 5px;
            border-bottom: 1px solid #1a1a3a;
            font-size: 13px;
        }
        .log-container p:last-child {
            border-bottom: none;
        }
        .combat-result.victory {
            background: #1b5e20;
            color: #a5d6a7;
        }
        .combat-result.defeat {
            background: #b71c1c;
            color: #ef9a9a;
        }
        .combat-result.timeout {
            background: #e65100;
            color: #ffcc80;
        }
        .scene-exits {
            margin-top: 12px;
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
        .exit-btn {
            padding: 6px 15px;
            border: none;
            border-radius: 3px;
            background: #1a237e;
            color: #fff;
            cursor: pointer;
            transition: all 0.3s;
        }
        .exit-btn:hover {
            background: #283593;
            transform: scale(1.05);
        }
        .scene-type {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 3px;
            font-size: 12px;
            margin-top: 5px;
        }
        .scene-type.safe {
            background: #1b5e20;
            color: #a5d6a7;
        }
        .scene-type.wild {
            background: #b71c1c;
            color: #ef9a9a;
        }
        .character-creation {
            text-align: center;
            padding: 30px 20px;
        }
        .character-creation h2 {
            margin-bottom: 20px;
            color: #ffd700;
        }
        .character-creation input {
            padding: 10px 15px;
            font-size: 16px;
            border-radius: 5px;
            border: none;
            background: #0a0a2a;
            color: #fff;
            width: 200px;
            margin-right: 10px;
        }
        .character-creation button {
            padding: 10px 30px;
            font-size: 16px;
            border: none;
            border-radius: 5px;
            background: #e94560;
            color: #fff;
            cursor: pointer;
            transition: all 0.3s;
        }
        .character-creation button:hover {
            background: #ff6b81;
            transform: scale(1.05);
        }
        .scene-info h2 {
            color: #ffd700;
            margin-bottom: 5px;
        }
        .scene-info p {
            color: #aaa;
            margin-bottom: 5px;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            #game-container { padding: 10px; }
            .action-btn { padding: 8px 12px; font-size: 12px; }
            .character-creation input { width: 150px; }
        }
    </style>
</head>
<body>
    <h1>⚔️ 寻亲风云录 ⚔️</h1>
    <div id="game-container">
        <div id="player-info">加载中...</div>
        <div id="scene-container"></div>
        <div id="combat-container"></div>
        <div id="combat-result"></div>
        <div id="action-buttons"></div>
        <div id="combat-log"></div>
    </div>

    <!-- 脚本文件 -->
    <script src="core/utils.js"></script>
    <script src="core/data.js"></script>
    <script src="core/state.js"></script>
    <script src="systems/combat.js"></script>
    <script src="systems/scene.js"></script>
    <script src="ui/renderer.js"></script>
    <script src="app.js"></script>
</body>
</html>
