<?php

namespace App\Enums;

enum AssetCondition: string
{
    case Good = 'good';
    case LightDamage = 'light_damage';
    case HeavyDamage = 'heavy_damage';
    case Lost = 'lost';
    case Disposed = 'disposed';
}
